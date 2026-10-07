import { useCallback, useEffect, useRef, useState } from "react";
import "./WorkflowEngine.css";
const SOCKET_URL = "wss://echo.websocket.events";
const MAX_RETRY_DELAY = 16000;
const OFFLINE_TEXT = "Offline - Reconnecting...";
const initialTasks = [
  {
    id: 1,
    title: "Task Alpha",
    request: "Verification request #001",
    status: "PENDING",
  },
  {
    id: 2,
    title: "Task Beta",
    request: "Verification request #002",
    status: "PENDING",
  },
  {
    id: 3,
    title: "Task Gamma",
    request: "Verification request #003",
    status: "IN_PROGRESS",
  },
  {
    id: 4,
    title: "Task Delta",
    request: "Verification request #004",
    status: "APPROVED",
  },
  {
    id: 5,
    title: "Task Echo",
    request: "Verification request #005",
    status: "REJECTED",
  },
];
const columns = [
  {
    key: "pending",
    label: "Pending",
    statuses: ["PENDING"],
  },
  {
    key: "in-progress",
    label: "In Progress",
    statuses: ["IN_PROGRESS"],
  },
  {
    key: "completed",
    label: "Completed",
    statuses: ["APPROVED", "REJECTED"],
  },
];
const statusNames = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const isDone = (status) =>
  status === "APPROVED" || status === "REJECTED";

const connectionText = {
  connecting: "Connecting",
  open: "Connected",
  closed: OFFLINE_TEXT,
};

export function ConnectingScreen() {
  return (
    <section
      className="joining-panel"
      aria-label="Connecting to the operations room"
    >
      <div className="joining-copy">
        <span className="spinner" aria-hidden="true" />
        <p>Connecting to the operations room...</p>
      </div>

      <div className="lane-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

export default function WorkflowEngine() {
  const [tasks, setTasks] = useState(initialTasks);
  const [connection, setConnection] = useState("connecting");
  const [hasConnected, setHasConnected] = useState(false);
  const [activity, setActivity] = useState([]);

  const socketRef = useRef(null);
  const retryTimer = useRef(null);
  const retryCount = useRef(0);
  const unmounted = useRef(false);

  const addActivity = useCallback((text) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setActivity((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          text: `${time} — ${text}`,
        },
        ...prev,
      ].slice(0, 6),
    );
  }, []);

  const connect = useCallback(() => {
    if (unmounted.current) {
      return;
    }

    clearTimeout(retryTimer.current);

    setConnection("connecting");

    const ws = new WebSocket(SOCKET_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) {
        return;
      }

      retryCount.current = 0;

      setConnection("open");
      setHasConnected(true);

      addActivity("Joined the operations room");
    };

    ws.onmessage = (event) => {
      if (unmounted.current) {
        return;
      }

      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      const { type, taskId, newStatus } = message ?? {};

      if (
        type !== "STATUS_UPDATE" ||
        !Number.isInteger(taskId) ||
        !statusNames[newStatus]
      ) {
        return;
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: newStatus }
            : task,
        ),
      );

      console.log(
        "[Analytics] Task status mutated via WebSocket",
        message,
      );

      addActivity(
        `Task ${taskId} marked ${statusNames[
          newStatus
        ].toLowerCase()}`,
      );
    };

    ws.onerror = () => {
      if (unmounted.current) {
        return;
      }

      setConnection("closed");
    };

    ws.onclose = () => {
      if (unmounted.current) {
        return;
      }

      if (socketRef.current !== ws) {
        return;
      }

      socketRef.current = null;

      const delay = Math.min(
        1000 * 2 ** retryCount.current,
        MAX_RETRY_DELAY,
      );

      retryCount.current += 1;

      setConnection("closed");

      addActivity(
        `Connection lost, retrying in ${delay / 1000}s`,
      );

      clearTimeout(retryTimer.current);

      retryTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [addActivity]);

  useEffect(() => {
    unmounted.current = false;

    connect();

    return () => {
      unmounted.current = true;

      clearTimeout(retryTimer.current);

      const ws = socketRef.current;

      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;

        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CLOSING
        ) {
          ws.close();
        }
      }

      socketRef.current = null;
    };
  }, [connect]);

  function sendStatus(taskId, newStatus) {
    const ws = socketRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      type: "STATUS_UPDATE",
      taskId,
      newStatus,
    };

    ws.send(JSON.stringify(payload));
  }

  function retryNow() {
    clearTimeout(retryTimer.current);

    retryCount.current = 0;

    const ws = socketRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      return;
    }

    connect();
  }

  const isOnline = connection === "open";

  const allDone = tasks.every((task) =>
    isDone(task.status),
  );

  function renderBoard() {
    if (!hasConnected && connection === "connecting") {
      return <ConnectingScreen />;
    }

    if (allDone) {
      return (
        <section
          className="clear-state"
          aria-label="Workflow board"
        >
          <div
            className="clear-mark"
            aria-hidden="true"
          >
            ✓
          </div>

          <div>
            <strong>All caught up!</strong>
            <p>No pending verification tasks.</p>
          </div>
        </section>
      );
    }

    return (
      <section
        className="ticket-board"
        aria-label="Workflow board"
      >
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) =>
            column.statuses.includes(task.status),
          );

          const headingId = `column-${column.key}`;

          return (
            <section
              className="ticket-lane"
              key={column.key}
              aria-labelledby={headingId}
            >
              <header className="lane-head">
                <h2 id={headingId}>{column.label}</h2>

                <span
                  aria-label={`${columnTasks.length} tasks`}
                >
                  {columnTasks.length}
                </span>
              </header>

              <ul className="ticket-list">
                {columnTasks.length === 0 && (
                  <li className="empty-lane">
                    Nothing here right now.
                  </li>
                )}

                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <article
                      className="ticket-card"
                      aria-labelledby={`task-${task.id}`}
                    >
                      <div className="ticket-main">
                        <h3 id={`task-${task.id}`}>
                          {task.title}
                        </h3>

                        <p>{task.request}</p>

                        <p className="ticket-status">
                          Status:{" "}
                          <strong>{task.status}</strong>
                        </p>
                      </div>

                      {isDone(task.status) ? (
                        <span className="decision-pill">
                          {statusNames[task.status]}
                        </span>
                      ) : task.status === "PENDING" ? (
                        <div
                          className="decision-row"
                          title={
                            isOnline
                              ? undefined
                              : OFFLINE_TEXT
                          }
                        >
                          <button
                            type="button"
                            disabled={!isOnline}
                            aria-label={`Approve ${task.title}`}
                            onClick={() =>
                              sendStatus(
                                task.id,
                                "APPROVED",
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            className="quiet"
                            disabled={!isOnline}
                            aria-label={`Reject ${task.title}`}
                            onClick={() =>
                              sendStatus(
                                task.id,
                                "REJECTED",
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    );
  }

  const count = (match) =>
    tasks.filter((task) => match(task.status)).length;

  return (
    <div className="operations-page">
      <div className="operations-wrap">
        <header className="room-header">
          <div className="room-title">
            <h1>Verification Portal</h1>
            <p>Real-Time Operations Workflow</p>
          </div>

          <div
            className="room-state"
            role="status"
            aria-live="polite"
          >
            <span
              className={`state-light ${connection}`}
              aria-hidden="true"
            />

            <span>{connectionText[connection]}</span>
          </div>
        </header>

        <section
          className="summary-strip"
          aria-label="Workflow summary"
        >
          <div>
            <span>
              {count(
                (status) => status === "PENDING",
              )}
            </span>
            <p>Pending</p>
          </div>

          <div>
            <span>
              {count(
                (status) => status === "IN_PROGRESS",
              )}
            </span>
            <p>In Progress</p>
          </div>

          <div>
            <span>{count(isDone)}</span>
            <p>Completed</p>
          </div>
        </section>

        {connection === "closed" && (
          <div className="offline-banner">
            <p>
              Connection dropped. Actions are locked until
              we're back online.
            </p>

            <button
              type="button"
              onClick={retryNow}
            >
              Retry now
            </button>
          </div>
        )}

        {renderBoard()}

        <section
          className="activity-panel"
          aria-labelledby="activity-title"
        >
          <h2 id="activity-title">
            Recent activity
          </h2>

          <ol>
            {activity.length === 0 && (
              <li>No events yet.</li>
            )}

            {activity.map((item) => (
              <li key={item.id}>
                {item.text}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}