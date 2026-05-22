import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function CycleGauge({ used }) {
  const remaining = Math.max(0, 70 - used);
  const data = [
    { name: "Used", value: used },
    { name: "Remaining", value: remaining },
  ];
  const usedColor = used > 60 ? "#EF4444" : "#2563EB";
  const colors = [usedColor, "#22C55E"];

  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={62}
            outerRadius={84}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div className="font-mono text-2xl font-semibold text-text-primary">
            {remaining.toFixed(1)}
          </div>
          <div className="overline">hrs left</div>
        </div>
      </div>
    </div>
  );
}
