import { AssistantFact } from '@/lib/api';

const RISK_STATES = ['CRITICAL', 'WARNING', 'ADEQUATE', 'EXCESS'] as const;

function displayValue(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'Not available' : String(value);
}

export function AssistantSourceFacts({ facts }: { facts: AssistantFact[] }) {
  const inventorySummaries = facts.filter((fact) => fact.kind === 'inventory_risk_summary' && fact.inventory_summary);
  const inventoryRecords = facts.filter((fact) => fact.kind === 'inventory_risk_record' && fact.inventory_record);
  const otherFacts = facts.filter((fact) => !fact.kind);

  return <div className="mt-3 space-y-4">
    {inventorySummaries.map((fact, index) => {
      const summary = fact.inventory_summary!;
      return <section key={`inventory-summary-${index}`} aria-label="Inventory risk totals" className="rounded-lg border border-tactical-800 bg-white p-3">
        <h4 className="text-sm font-semibold text-tactical-200">Inventory risk totals</h4>
        <p className="mt-1 text-sm text-tactical-400">{summary.record_count} synthetic inventory-risk records</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RISK_STATES.map((state) => <div key={state} className="rounded-md bg-tactical-50 px-3 py-2">
            <dt className="text-xs text-tactical-500">{state}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-tactical-200">{summary.risk_counts[state] ?? 'Not available'}</dd>
          </div>)}
        </dl>
      </section>;
    })}

    {inventoryRecords.length > 0 && <section aria-label="Inventory risk records">
      <h4 className="text-sm font-semibold text-tactical-200">Inventory records from SupplyFlow</h4>
      <div tabIndex={0} role="region" aria-label="Scroll inventory source facts horizontally" className="table-scroll mt-2 max-w-full overflow-x-auto rounded-lg border border-tactical-800 bg-white">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <caption className="sr-only">Source inventory records, coverage, risk status, and quantities</caption>
          <thead className="bg-tactical-50 text-xs text-tactical-500">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">Coverage</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Supply item</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Location</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Risk status</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Days of supply</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">On hand (units)</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Daily demand (units/day)</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Safety stock breach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tactical-800">
            {inventoryRecords.map((fact, index) => {
              const record = fact.inventory_record!;
              const coverage = fact.coverage;
              const coverageText = coverage
                ? coverage.complete
                  ? `Complete ${coverage.group}: ${coverage.index} of ${coverage.total}`
                  : `Example ${coverage.index} of ${coverage.provided}; ${coverage.total} total`
                : 'Coverage unavailable';
              return <tr key={`inventory-record-${index}`}>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-tactical-500">{coverageText}</td>
                <td className="px-3 py-2.5 font-medium text-tactical-200">{record.item_name || 'Not available'}</td>
                <td className="px-3 py-2.5 text-tactical-300">{record.location_name || 'Not available'}</td>
                <td className="px-3 py-2.5 font-medium text-tactical-300">{record.risk_state || 'Not available'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-tactical-300">{displayValue(record.days_of_supply)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-tactical-300">{displayValue(record.current_quantity)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-tactical-300">{displayValue(record.daily_demand_p50)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-tactical-300">{record.safety_stock_breach == null ? 'Not available' : record.safety_stock_breach ? 'Yes' : 'No'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {inventoryRecords.some((fact) => fact.coverage && !fact.coverage.complete) && <p className="mt-2 text-sm text-amber-800">Only the labelled examples are provided; this table is not a complete list.</p>}
    </section>}

    {otherFacts.length > 0 && <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-tactical-300">
      {otherFacts.map((fact, index) => <li key={`${fact.source}-${index}`}>{fact.fact}</li>)}
    </ul>}
  </div>;
}
