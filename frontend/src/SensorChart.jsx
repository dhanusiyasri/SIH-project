import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function SensorChart({
  title,
  subtitle,
  data,
  dataKey,
  unit,
}) {
  return (
    <div className="chart-card">

      <div className="chart-header">

        <div>
          <h3>
            {title}
          </h3>

          <p>
            {subtitle}
          </p>
        </div>

        <span className="chart-live">
          LIVE
        </span>

      </div>


      <div className="chart-container">

        {data.length === 0 ? (

          <div className="chart-empty">
            Waiting for sensor readings...
          </div>

        ) : (

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 15,
                left: 5,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />


              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                }}
                minTickGap={35}
                tickLine={false}
                axisLine={false}
              />


              <YAxis
                tick={{
                  fontSize: 10,
                }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(value) =>
                  `${value}${unit}`
                }
              />


              <Tooltip
                labelFormatter={(label) =>
                  `Time: ${label}`
                }
                formatter={(value) => [
                  `${Number(value).toFixed(
                    dataKey ===
                      "accel_peak_g"
                      ? 3
                      : 2
                  )}${unit}`,
                  title,
                ]}
              />


              <Line
                type="monotone"
                dataKey={dataKey}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                }}
                isAnimationActive={false}
                connectNulls
              />

            </LineChart>

          </ResponsiveContainer>

        )}

      </div>

    </div>
  );
}

export default SensorChart;