import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../common/sidebar";
import { apiGet } from "../utils/api";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "./dashboard.css";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface MemberStat {
  userId: number;
  fullName: string;
  taskCount: number;
  doneCount: number;
}

interface ActivityLogDTO {
  activityId: number;
  taskTitle: string | null;
  userFullName: string | null;
  actionType: string;
  description: string | null;
  createdAt: string;
}

interface DashboardStats {
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  overdueCount: number;
  dueTodayCount: number;
  completionRate: number;
  tasksByMember: MemberStat[];
  recentActivity: ActivityLogDTO[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  TO_DO: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  DONE: "#22c55e",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#2ecc71",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<DashboardStats>("/dashboard/stats");
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="dashboard-main">
          <Spinner label="Loading dashboard..." />
        </main>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="dashboard-main">
          <EmptyState icon="⚠️" title="Could not load dashboard" message={error || "No data"} />
        </main>
      </div>
    );
  }

  const statusLabels = Object.keys(stats.tasksByStatus);
  const priorityLabels = Object.keys(stats.tasksByPriority);

  const doughnutData = {
    labels: statusLabels,
    datasets: [
      {
        data: statusLabels.map((s) => stats.tasksByStatus[s]),
        backgroundColor: statusLabels.map((s) => STATUS_COLORS[s] || "#999"),
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: priorityLabels,
    datasets: [
      {
        label: "Tasks",
        data: priorityLabels.map((p) => stats.tasksByPriority[p]),
        backgroundColor: priorityLabels.map((p) => PRIORITY_COLORS[p] || "#999"),
        borderRadius: 6,
      },
    ],
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h2>Welcome back!</h2>
            <p className="muted">Here's what's happening with your tasks today</p>
          </div>
        </header>

        {/* Metric cards */}
        <section className="cards-row">
          <div className="card small">
            <div className="card-title">Tasks Overdue</div>
            <div className="card-value danger">{stats.overdueCount}</div>
            <div className="card-sub">Requires immediate attention</div>
          </div>
          <div className="card small">
            <div className="card-title">Due Today</div>
            <div className="card-value">{stats.dueTodayCount}</div>
            <div className="card-sub">Complete before midnight</div>
          </div>
          <div className="card small">
            <div className="card-title">Completion Rate</div>
            <div className="card-value success">{Math.round(stats.completionRate * 100)}%</div>
            <div className="card-sub">Of all active tasks</div>
          </div>
        </section>

        {/* Charts */}
        <section className="content-grid">
          <div className="card large chart-card">
            <div className="card-heading">Tasks by Status</div>
            <div className="chart-canvas-wrap">
              <Doughnut
                data={doughnutData}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
              />
            </div>
          </div>

          <div className="card large chart-card">
            <div className="card-heading">Tasks by Priority</div>
            <div className="chart-canvas-wrap">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            </div>
          </div>
        </section>

        {/* Tasks per member */}
        <section className="card recent-activity">
          <div className="card-heading">Tasks per Member</div>
          {stats.tasksByMember.length === 0 ? (
            <EmptyState title="No assignments" message="No tasks are assigned yet." />
          ) : (
            <table className="member-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {stats.tasksByMember.map((m) => {
                  const pct = m.taskCount === 0 ? 0 : Math.round((m.doneCount / m.taskCount) * 100);
                  return (
                    <tr key={m.userId}>
                      <td>{m.fullName}</td>
                      <td>{m.taskCount}</td>
                      <td>{m.doneCount}</td>
                      <td>
                        <div className="member-progress">
                          <div className="member-progress-bar" style={{ width: `${pct}%` }} />
                          <span>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent activity */}
        <section className="card recent-activity">
          <div className="card-heading">Recent Activity</div>
          <div className="activity-list">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((a) => (
                <div key={a.activityId} className="activity-item">
                  <div className="activity-left">
                    <span className="activity-dot" />
                    <div className="activity-content">
                      <div>
                        <strong>{a.userFullName || "Someone"}</strong>{" "}
                        {a.description || a.actionType}{" "}
                        {a.taskTitle && <strong>{a.taskTitle}</strong>}
                      </div>
                      <div className="muted">{formatTimeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No activity yet" message="Activity will appear here." />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
