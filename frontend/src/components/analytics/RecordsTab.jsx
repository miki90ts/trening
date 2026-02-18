import React from "react";
import Card from "../common/Card";

function RecordsTab({ personalRecords, formatScore }) {
  return (
    <div className="analytics-content">
      {personalRecords.length > 0 ? (
        <Card>
          <h3>🏆 Lični rekordi po kategoriji</h3>
          <div className="results-table-wrapper">
            <table className="results-table records-table">
              <thead>
                <tr>
                  <th>Vežba</th>
                  <th>Kategorija</th>
                  <th>Najbolji score</th>
                  <th>Setovi</th>
                  <th>Ponavljanja</th>
                  <th>Max teg</th>
                  <th>Est. 1RM</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {personalRecords.map((r, i) => (
                  <tr key={i} className="record-row">
                    <td>
                      <span className="exercise-icon-cell">
                        {r.exercise_icon}
                      </span>
                      {r.exercise_name}
                    </td>
                    <td>{r.category_name}</td>
                    <td className="value-cell record-score">
                      {formatScore(r.score, r.value_type, r.has_weight)}
                    </td>
                    <td>{r.total_sets}</td>
                    <td>{r.total_reps}</td>
                    <td>
                      {r.max_weight ? `${parseFloat(r.max_weight)} kg` : "-"}
                    </td>
                    <td className="estimated-1rm-cell">
                      {r.has_weight && r.estimated_1rm > 0 ? (
                        <span className="badge-1rm">{r.estimated_1rm} kg</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {new Date(r.attempt_date).toLocaleDateString("sr-RS")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="empty-card">
          <p className="empty-state">
            Još nema ličnih rekorda. Unesite rezultate da biste videli rekorde!
          </p>
        </Card>
      )}
    </div>
  );
}

export default RecordsTab;
