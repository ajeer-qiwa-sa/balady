import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_URL } from "../api";

const AllCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const token = localStorage.getItem("token") || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);
        const res = await axios.get(`${API_URL}/api/certificates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCertificates(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchCertificates();
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMsg("");
    try {
      const token = localStorage.getItem("token") || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);
      let blobData;
      let filename = `certificates_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

      try {
        const res = await axios.get(`${API_URL}/api/certificates-backup`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });
        blobData = res.data;
        const contentDisposition = res.headers["content-disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+)"?/);
          if (match) filename = match[1];
        }
      } catch (backupApiErr) {
        const dataToExport = certificates && certificates.length > 0 ? certificates : [];
        blobData = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
      }

      // تحميل الملف
      const finalBlob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: "application/json" });
      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setBackupMsg("✅ تم تحميل النسخة الاحتياطية بنجاح!");
    } catch (err) {
      console.error(err);
      setBackupMsg("❌ حدث خطأ أثناء التحميل، حاول مرة أخرى.");
    } finally {
      setBackupLoading(false);
      setTimeout(() => setBackupMsg(""), 4000);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1 style={{ margin: 0 }}>All Certificates</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {backupMsg && (
            <span
              style={{
                fontSize: "14px",
                color: backupMsg.startsWith("✅") ? "#16a34a" : "#dc2626",
                background: backupMsg.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${backupMsg.startsWith("✅") ? "#86efac" : "#fca5a5"}`,
                borderRadius: "8px",
                padding: "6px 14px",
              }}
            >
              {backupMsg}
            </span>
          )}

          <button
            onClick={handleBackup}
            disabled={backupLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: backupLoading ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: backupLoading ? "not-allowed" : "pointer",
              boxShadow: backupLoading ? "none" : "0 4px 14px rgba(59,130,246,0.4)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!backupLoading) e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {backupLoading ? (
              <>
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid #fff",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                جاري التحميل...
              </>
            ) : (
              <>
                💾 نسخة احتياطية
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {certificates.length === 0 ? (
        <p>No certificates added yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#fff",
          }}
        >
          <thead>
            <tr style={{ background: "#eee", textAlign: "right" }}>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>اسم الطالب</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>البرنامج التثقيفي</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>تاريخ الإصدار</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>عرض</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((c) => (
              <tr key={c._id} style={{ textAlign: "right" }}>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{c.name}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{c.educationalProgram}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {c.healthCertIssueDate ? new Date(c.healthCertIssueDate).toLocaleDateString("en-GB") : '-'}
                </td>

                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  <Link
                    to={`/certificate/${c._id}`}
                    style={{
                      padding: "6px 12px",
                      background: "#333",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: "5px",
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AllCertificates;

