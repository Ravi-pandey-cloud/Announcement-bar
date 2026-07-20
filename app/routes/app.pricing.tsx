export default function PricingPage() {
  return (
     <div className="dashboard-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper {
          padding: 32px;
          margin:20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #202223;
          background-color: #f6f6f7;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-title-section h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #202223;
        }

        .header-title-section p {
          font-size: 14px;
          color: #6d7175;
          margin: 0;
        }

        .btn-primary {
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .btn-primary:hover {
          background-color: #333333;
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-card-title {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-card-value {
          font-size: 26px;
          font-weight: 700;
          color: #202223;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-icon {
          font-size: 18px;
          line-height: 1;
        }

        .usage-text {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #202223;
          margin-bottom: 8px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background-color: #f1f2f3;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background-color: #1a1a1a;
          border-radius: 3px;
        }

        .main-card {
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 20px;
        }

        .search-container {
          position: relative;
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px 10px 42px;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #1a1a1a;
        }

        .search-icon-svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6d7175;
          pointer-events: none;
          width: 18px;
          height: 18px;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .announcements-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .announcements-table th {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #6d7175;
          border-bottom: 1px solid #e3e3e3;
        }

        .announcements-table td {
          padding: 16px;
          font-size: 14px;
          border-bottom: 1px solid #f1f1f1;
          color: #202223;
          vertical-align: middle;
        }

        .announcements-table tr:last-child td {
          border-bottom: none;
        }

        .announcement-name {
          font-weight: 500;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .announcement-subtitle {
          font-size: 12px;
          color: #6d7175;
        }

        /* Status Pills */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.2;
        }

        .status-live {
          background-color: #e6f4ea;
          color: #137333;
        }

        .status-paused {
          background-color: #f1f3f4;
          color: #5f6368;
        }

        .status-scheduled {
          background-color: #e8f0fe;
          color: #1a73e8;
        }

        .status-expired {
          background-color: #fce8e6;
          color: #c5221f;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-live .status-dot { background-color: #137333; }
        .status-paused .status-dot { background-color: #5f6368; }
        .status-scheduled .status-dot { background-color: #1a73e8; }
        .status-expired .status-dot { background-color: #c5221f; }

        .actions-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .btn-action-icon {
          border: 1px solid #e3e3e3;
          background: #ffffff;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6d7175;
          transition: background-color 0.15s, border-color 0.15s, color 0.15s;
          padding: 0;
        }

        .btn-action-icon:hover {
          background-color: #f6f6f7;
          border-color: #c9cccf;
          color: #202223;
        }

        .actions-dropdown-menu {
          position: absolute;
          right: 0;
          top: 36px;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 100;
          min-width: 130px;
          padding: 4px 0;
          display: flex;
          flex-direction: column;
        }

        .dropdown-item {
          background: none;
          border: none;
          padding: 8px 16px;
          text-align: left;
          font-size: 13px;
          color: #202223;
          cursor: pointer;
          width: 100%;
        }

        .dropdown-item:hover {
          background-color: #f6f6f7;
        }

        .dropdown-item.item-delete {
          color: #d32f2f;
        }

        .dropdown-item.item-delete:hover {
          background-color: #ffebee;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 12px;
        }

        .empty-state h3 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #202223;
        }

        .empty-state p {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 20px;
        }

        dialog::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }
      `}} />
        <div className="dashboard-header">
        <div className="header-title-section">
          <h1>Price</h1>
        </div>
       
      </div>
      </div>
  );
}


