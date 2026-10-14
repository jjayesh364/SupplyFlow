"""Safety and failure-mode tests for the optional read-only AI assistant."""

from types import SimpleNamespace

import httpx
import pytest

from app.api.v1.endpoints import assistant as assistant_endpoint
from app.api.v1.endpoints.assistant import AssistantQuestion
from app.core.config import Settings, settings
from app.services import assistant_service
from app.services.assistant_service import AssistantUnavailable


def test_provider_disabled_without_server_key(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    assert assistant_service.assistant_available() is False
    with pytest.raises(AssistantUnavailable, match="not configured"):
        # Provider check happens before any database access.
        import asyncio

        asyncio.run(assistant_service.answer(None, "How is inventory?"))


def test_question_validation_rejects_empty_and_oversized_input():
    with pytest.raises(ValueError, match="Enter a question"):
        assistant_service.validate_question("   ")
    with pytest.raises(ValueError, match="1000 characters"):
        assistant_service.validate_question("x" * 1001)
    for unsafe in (
        "Contact abc@example.com",
        "Coordinates 33.1234, 77.5678",
        "Coordinate 33.1234N 77.5678E",
        "Show latitude: 33.1",
        "Classified live deployment details",
        "Call +91 98765 43210",
    ):
        with pytest.raises(ValueError, match="Remove personal"):
            assistant_service.validate_question(unsafe)
    assert assistant_service.validate_question("  Explain risk  ") == "Explain risk"


@pytest.mark.asyncio
async def test_provider_timeout_logs_only_safe_category_and_keeps_public_message(monkeypatch, caplog):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")

    class TimedOutClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def post(self, *_args, **_kwargs):
            raise httpx.ReadTimeout("transport detail")

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", TimedOutClient)
    with pytest.raises(AssistantUnavailable) as error:
        await assistant_service.explain("do not log this question", [])

    assert str(error.value) == "AI help is temporarily unavailable because the provider timed out."
    timeout_records = [record for record in caplog.records if "Gemini operation" in record.getMessage()]
    assert len(timeout_records) == 1
    record = timeout_records[0]
    assert record.getMessage() == "Gemini operation generate_content timed out (ReadTimeout)"
    assert record.args == ("ReadTimeout",)
    assert record.exc_info is None
    assert "transport detail" not in record.getMessage()
    assert "do not log this question" not in record.getMessage()


@pytest.mark.asyncio
async def test_free_quota_exhaustion_has_no_paid_fallback(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")

    class QuotaResponse:
        status_code = 429

    class QuotaClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def post(self, *_args, **_kwargs):
            return QuotaResponse()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", QuotaClient)
    with pytest.raises(AssistantUnavailable, match="free Gemini quota is exhausted"):
        await assistant_service.explain("question", [])


@pytest.mark.asyncio
async def test_provider_http_failure_logs_safe_diagnostics_only(monkeypatch, caplog):
    secret = "test-secret-api-key"
    prompt = "private test question"
    provider_message = f"Invalid key {secret}; rejected prompt {prompt}"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", secret)

    class ErrorResponse:
        status_code = 403

        def json(self):
            return {"error": {"code": 403, "status": "PERMISSION_DENIED", "message": provider_message}}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs): return ErrorResponse()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    with pytest.raises(AssistantUnavailable, match="No paid fallback"):
        await assistant_service.explain(prompt, [])

    messages = " ".join(record.getMessage() for record in caplog.records)
    assert "HTTP 403" in messages
    assert "PERMISSION_DENIED" in messages
    assert "provider_code=403" in messages
    assert secret not in messages
    assert prompt not in messages
    assert provider_message not in messages


@pytest.mark.asyncio
async def test_provider_transport_failure_logs_exception_type_without_details(monkeypatch, caplog):
    secret = "test-secret-api-key"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", secret)

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs):
            raise httpx.ConnectError(f"could not connect with {secret}")

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    with pytest.raises(AssistantUnavailable, match="provider could not be reached"):
        await assistant_service.explain("private test question", [])

    messages = " ".join(record.getMessage() for record in caplog.records)
    assert "transport failure (ConnectError)" in messages
    assert secret not in messages
    assert "private test question" not in messages


@pytest.mark.asyncio
async def test_provider_call_uses_stable_model_server_header_and_bounded_output(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")
    monkeypatch.setattr(settings, "GEMINI_TIMEOUT_SECONDS", 60.0)
    captured = {}

    calls = []

    class Response:
        status_code = 200

        def json(self):
            return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "The backend reports 4 critical records."}]}}]}

    class Client:
        def __init__(self, **kwargs):
            captured["timeout"] = kwargs["timeout"].as_dict()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def post(self, url, **kwargs):
            calls.append(url)
            captured.update(url=url, **kwargs)
            return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    facts = [{"source": "GET /api/v1/inventory/risk-assessment", "fact": "4 critical records."}]
    answer = await assistant_service.explain("summarize", facts)

    assert answer == "The backend reports 4 critical records."
    assert "/models/gemini-3.1-flash-lite:generateContent" in captured["url"]
    assert captured["headers"]["x-goog-api-key"] == "mock-only"
    assert captured["json"]["generationConfig"]["maxOutputTokens"] == 640
    assert captured["timeout"] == {
        "connect": 60.0,
        "read": 60.0,
        "write": 60.0,
        "pool": 60.0,
    }
    assert "summarize" in captured["json"]["contents"][0]["parts"][0]["text"]
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_provider_503_retries_once_after_retry_after_and_then_succeeds(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")
    delays = []
    calls = 0

    async def fake_sleep(delay):
        delays.append(delay)

    monkeypatch.setattr(assistant_service.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(assistant_service.random, "uniform", lambda low, high: 0.1)

    class Response:
        def __init__(self, status_code):
            self.status_code = status_code
            self.headers = {}

        def json(self):
            return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "Service is available."}]}}]}

    class UnavailableResponse(Response):
        def __init__(self, status_code):
            super().__init__(status_code)
            self.headers = {"Retry-After": "2"}

        def json(self):
            return {"error": {"code": 503, "status": "UNAVAILABLE", "message": "private provider detail"}}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs):
            nonlocal calls
            calls += 1
            return UnavailableResponse(503) if calls == 1 else Response(200)

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    assert await assistant_service.explain("summarize", []) == "Service is available."
    assert calls == 2
    assert delays == [2.1]


@pytest.mark.asyncio
async def test_provider_503_fails_after_exactly_one_retry_with_safe_message(monkeypatch, caplog):
    secret = "test-secret-api-key"
    prompt = "private test question"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", secret)

    async def fake_sleep(_delay):
        return None

    monkeypatch.setattr(assistant_service.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(assistant_service.random, "uniform", lambda _low, _high: 0.1)
    calls = 0

    class Response:
        status_code = 503

        def __init__(self):
            self.headers = {"Retry-After": "0"}

        def json(self):
            return {"error": {"code": 503, "status": "UNAVAILABLE", "message": f"{secret} {prompt}"}}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs):
            nonlocal calls
            calls += 1
            return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    with pytest.raises(AssistantUnavailable, match="temporarily unavailable.*try again shortly"):
        await assistant_service.explain(prompt, [])

    assert calls == 2
    messages = " ".join(record.getMessage() for record in caplog.records)
    assert secret not in messages
    assert prompt not in messages
    assert f"{secret} {prompt}" not in messages


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [400, 401, 403, 429])
async def test_provider_non_retryable_http_errors_are_not_retried(monkeypatch, status_code):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")
    calls = 0

    class Response:
        def __init__(self):
            self.status_code = status_code
            self.headers = {}

        def json(self):
            return {"error": {"code": status_code, "status": "NON_RETRYABLE", "message": "private detail"}}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs):
            nonlocal calls
            calls += 1
            return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    with pytest.raises(AssistantUnavailable):
        await assistant_service.explain("question", [])
    assert calls == 1


@pytest.mark.asyncio
async def test_provider_503_with_long_retry_after_does_not_retry_early(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")
    calls = 0

    class Response:
        status_code = 503

        def __init__(self):
            self.headers = {"Retry-After": "60"}
        def json(self):
            return {"error": {"code": 503, "status": "UNAVAILABLE"}}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs):
            nonlocal calls
            calls += 1
            return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    with pytest.raises(AssistantUnavailable, match="temporarily unavailable.*try again shortly"):
        await assistant_service.explain("question", [])
    assert calls == 1


def test_gemini_timeout_default_and_environment_override(monkeypatch):
    monkeypatch.delenv("GEMINI_TIMEOUT_SECONDS", raising=False)
    assert Settings(_env_file=None).GEMINI_TIMEOUT_SECONDS == 60.0

    monkeypatch.setenv("GEMINI_TIMEOUT_SECONDS", "37")
    assert Settings(_env_file=None).GEMINI_TIMEOUT_SECONDS == 37.0


@pytest.mark.asyncio
async def test_model_output_limit_is_disclosed_in_explanation(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")

    class Response:
        status_code = 200

        def json(self):
            return {"candidates": [{"finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "Partial explanation"}]}}]}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs): return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    explanation = await assistant_service.explain("summarize", [])
    assert explanation.startswith("Partial explanation")
    assert "may be incomplete" in explanation


@pytest.mark.asyncio
async def test_model_output_limit_notice_uses_selected_language(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")

    class Response:
        status_code = 200
        def json(self):
            return {"candidates": [{"finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "\u0905\u0902\u0936\u093f\u0915 \u0909\u0924\u094d\u0924\u0930"}]}}]}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, *_args, **_kwargs): return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    explanation = await assistant_service.explain("summarize", [], "hi")
    assert explanation.startswith("\u0905\u0902\u0936\u093f\u0915")
    assert assistant_service.INCOMPLETE_NOTICES["hi"] in explanation


@pytest.mark.asyncio
@pytest.mark.parametrize(("language", "native_name"), [
    ("en", "English"),
    ("hi", "Hindi"),
    ("gu", "Gujarati"),
    ("mr", "Marathi"),
    ("pa", "Punjabi"),
    ("bn", "Bengali"),
])
async def test_supported_language_is_instructed_and_technical_sources_stay_out_of_model_context(monkeypatch, language, native_name):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-only")
    captured = {}

    class Response:
        status_code = 200
        def json(self):
            return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "Translated answer: 4 WARNING records; 3 days of supply."}]}}]}

    class Client:
        def __init__(self, **_kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, _url, **kwargs):
            captured.update(kwargs)
            return Response()

    monkeypatch.setattr(assistant_service.httpx, "AsyncClient", Client)
    facts = [{"source": "GET /api/v1/inventory/risk-assessment", "fact": "4 WARNING records; 3 days of supply."}]
    explanation = await assistant_service.explain("Explain warnings", facts, language)

    instruction = captured["json"]["system_instruction"]["parts"][0]["text"]
    prompt_data = captured["json"]["contents"][0]["parts"][0]["text"]
    assert native_name in instruction
    assert "entire explanation must be" in instruction
    assert "Preserve every supplied number" in instruction
    assert "say when a requested value is missing" in instruction
    assert "4 WARNING records" in prompt_data
    assert "/api/v1/" not in prompt_data
    assert explanation.endswith("3 days of supply.")


def test_unsupported_language_is_rejected():
    with pytest.raises(ValueError):
        AssistantQuestion(question="Explain risk", language="fr")
    with pytest.raises(ValueError, match="supported response languages"):
        import asyncio

        asyncio.run(assistant_service.explain("Explain risk", [], "fr"))


@pytest.mark.asyncio
async def test_api_forwards_selected_language_and_keeps_facts_separate(async_client, monkeypatch):
    captured = {}

    async def fake_answer(_db, question, language):
        captured.update(question=question, language=language)
        return ([{
            "source": "GET /api/v1/inventory/risk-assessment",
            "fact": "4 WARNING records; 3 days of supply.",
            "kind": "inventory_risk_record",
            "inventory_record": {
                "item_name": "Synthetic supply",
                "location_name": "Synthetic depot",
                "risk_state": "WARNING",
                "days_of_supply": 3.0,
                "current_quantity": 30.0,
                "daily_demand_p50": 10.0,
                "safety_stock_breach": False,
            },
            "coverage": {"group": "WARNING records", "index": 1, "provided": 4, "total": 4, "complete": True},
        }], "Gujarati explanation: 4 WARNING records; 3 days of supply.")

    monkeypatch.setattr(assistant_endpoint, "answer", fake_answer)
    response = await async_client.post("/api/v1/assistant/ask", json={"question": "Explain warnings", "language": "gu"})

    assert response.status_code == 200
    assert captured == {"question": "Explain warnings", "language": "gu"}
    body = response.json()
    assert body["facts"][0]["inventory_record"] == {
        "item_name": "Synthetic supply",
        "location_name": "Synthetic depot",
        "risk_state": "WARNING",
        "days_of_supply": 3.0,
        "current_quantity": 30.0,
        "daily_demand_p50": 10.0,
        "safety_stock_breach": False,
    }
    assert body["facts"][0]["coverage"]["complete"] is True
    assert body["explanation"].startswith("Gujarati explanation")


@pytest.mark.asyncio
async def test_api_rejects_unsupported_language(async_client):
    response = await async_client.post("/api/v1/assistant/ask", json={"question": "Explain risk", "language": "fr"})
    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize(("warning_count", "expected_count", "expected_prefix"), [
    (4, 4, "Complete WARNING records"),
    (5, 3, "Example"),
])
async def test_inventory_warning_examples_state_full_or_partial_coverage(monkeypatch, warning_count, expected_count, expected_prefix):
    monkeypatch.setattr(settings, "IS_SYNTHETIC_DATA_ONLY", True)

    async def fake_assess(_db):
        return [SimpleNamespace(
            risk_state="WARNING", item_name=f"Synthetic item {i}", location_name="Synthetic node",
            days_of_supply=3.0, current_quantity=30.0, daily_demand_p50=10.0,
            safety_stock_breach=False,
        ) for i in range(warning_count)]

    monkeypatch.setattr(assistant_service.inventory_risk_service, "assess_network_inventory_risk", fake_assess)

    class Result:
        def scalar_one(self): return False

    class ReadOnlyDB:
        async def execute(self, _statement): return Result()

    facts = await assistant_service.collect_facts(ReadOnlyDB(), "inventory warnings")
    detail_facts = [entry["fact"] for entry in facts if entry["fact"].startswith(("Example ", "Complete WARNING records"))]
    structured_records = [entry for entry in facts if entry.get("kind") == "inventory_risk_record"]
    assert len(detail_facts) == expected_count
    assert len(structured_records) == expected_count
    assert detail_facts[0].startswith(expected_prefix)
    assert structured_records[0]["inventory_record"] == {
        "item_name": "Synthetic item 0",
        "location_name": "Synthetic node",
        "risk_state": "WARNING",
        "days_of_supply": 3.0,
        "current_quantity": 30.0,
        "daily_demand_p50": 10.0,
        "safety_stock_breach": False,
    }
    assert structured_records[0]["coverage"] == {
        "group": "WARNING records",
        "index": 1,
        "provided": expected_count,
        "total": warning_count,
        "complete": warning_count <= 4,
    }
    summary = next(entry["inventory_summary"] for entry in facts if entry.get("kind") == "inventory_risk_summary")
    assert summary == {
        "record_count": warning_count,
        "risk_counts": {"CRITICAL": 0, "WARNING": warning_count, "ADEQUATE": 0, "EXCESS": 0},
    }
    if warning_count == 5:
        assert detail_facts[-1].startswith("Example 3 of 3; 5 WARNING records total:")
    else:
        assert detail_facts[-1].startswith("Complete WARNING records (4 of 4):")


@pytest.mark.asyncio
async def test_context_is_minimized_and_database_access_is_read_only(monkeypatch):
    monkeypatch.setattr(settings, "IS_SYNTHETIC_DATA_ONLY", True)

    async def fake_assess(_db):
        return [SimpleNamespace(
            risk_state="CRITICAL", item_name="Synthetic water", location_name="Synthetic Node",
            days_of_supply=1.2, current_quantity=12.0, daily_demand_p50=10.0,
            safety_stock_breach=True, id="private-row-id", latitude=33.0, longitude=77.0,
        )]

    monkeypatch.setattr(assistant_service.inventory_risk_service, "assess_network_inventory_risk", fake_assess)

    class Result:
        def __init__(self, rows=(), one=None, scalar=None):
            self._rows, self._one, self._scalar = rows, one, scalar

        def all(self):
            return self._rows

        def one(self):
            return self._one

        def scalar_one(self):
            return self._scalar

    class ReadOnlyDB:
        def __init__(self):
            self.statements = []

        async def execute(self, statement):
            self.statements.append(str(statement).strip())
            sql = str(statement).lower()
            if "exists" in sql:
                return Result(scalar=False)
            if "shipments.status" in sql:
                return Result(rows=[("IN_TRANSIT", 2)])
            if "count(demand_forecasts.id)" in sql:
                return Result(one=(0, None, None))
            if "recommendations.status" in sql:
                return Result(rows=[])
            raise AssertionError("Unexpected database query")

    db = ReadOnlyDB()
    facts = await assistant_service.collect_facts(db, "summarize the demonstration")
    serialized = str(facts)
    assert "private-row-id" not in serialized
    assert "33.0" not in serialized and "77.0" not in serialized
    assert all(statement.lower().startswith("select") for statement in db.statements)
    assert any("Synthetic water" in fact["fact"] for fact in facts)
    assert any("No synthetic forecast records" in fact["fact"] for fact in facts)


@pytest.mark.asyncio
async def test_database_with_unmarked_data_disables_assistant_before_context_read(monkeypatch):
    monkeypatch.setattr(settings, "IS_SYNTHETIC_DATA_ONLY", True)

    class UnsafeDB:
        async def execute(self, _statement):
            class Result:
                def scalar_one(self):
                    return True
            return Result()

    with pytest.raises(AssistantUnavailable, match="not marked synthetic"):
        await assistant_service.collect_facts(UnsafeDB(), "inventory")


@pytest.mark.asyncio
async def test_api_exposes_unavailable_state_and_rejects_oversized_input(async_client, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    status_response = await async_client.get("/api/v1/assistant/status")
    assert status_response.status_code == 200
    assert status_response.json()["available"] is False

    disabled = await async_client.post("/api/v1/assistant/ask", json={"question": "What is the risk?"})
    assert disabled.status_code == 200
    assert disabled.json()["available"] is False

    invalid = await async_client.post("/api/v1/assistant/ask", json={"question": "x" * 1001})
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_demo_read_only_mode_blocks_existing_write_operations(async_client, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_READ_ONLY_MODE", True)

    training = await async_client.post("/api/v1/forecasts/train-and-refresh")
    optimization = await async_client.post("/api/v1/optimization/solve-dispatch")

    assert training.status_code == 403
    assert optimization.status_code == 403
    assert "read-only demonstration" in training.json()["detail"]
