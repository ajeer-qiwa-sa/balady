import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/AddCertificate.css";
import { baladyData } from "../data/baladyData";
import { API_URL } from "../api";

function AddCertificate() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);

  // Helper to format Date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Helper to get Hijri date string (YYYY-MM-DD)
  const getHijriDate = (date) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'islamic-umalqura' };
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', options).formatToParts(date);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
  };

  // Calculate Dates
  const today = new Date();

  // Gregorian +1 Year
  const nextYear = new Date();
  nextYear.setFullYear(today.getFullYear() + 1);

  // Hijri Calculations
  const todayHijriStr = getHijriDate(today); // e.g. 1447-08-05
  const [hYear, hMonth, hDay] = todayHijriStr.split('-');

  const expiryHijriStr = `${parseInt(hYear) + 1}-${hMonth}-${hDay}`; // 1448-08-05
  const eduHijriStr = `${parseInt(hYear) + 3}-${hMonth}-${hDay}`;    // 1450-08-05

  const [form, setForm] = useState({
    _id: "",
    customId: "",
    name: "",
    amana: "",
    baladiya: "",
    nationalId: "",
    healthCertificateNumber: "",
    gender: "",
    nationality: "",
    job: "",
    healthCertIssueDate: formatDate(today),
    healthCertExpiryDate: formatDate(nextYear),
    healthCertIssueDateHijri: todayHijriStr,
    healthCertExpiryDateHijri: expiryHijriStr,
    educationalProgram: "",
    educationalProgramEndDate: eduHijriStr,
    licenseNumber: "",
    establishmentName: "",
    establishmentNumber: "",
    selectedLogo: "logos/الرياض.png",
  });

  const [idStatus, setIdStatus] = useState({ checking: false, message: "", isError: false, isValidHex: false });
  const [photo, setPhoto] = useState(null);
  const [municipalities, setMunicipalities] = useState([]);
  const [isManualBaladiya, setIsManualBaladiya] = useState(false);
  const [manualBaladiya, setManualBaladiya] = useState("");

  // فحص صحة الآيدي وعدم تكراره في قاعدة البيانات
  const handleIdValidation = async (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setIdStatus({ checking: false, message: "", isError: false, isValidHex: false });
      return;
    }

    // 1. التحقق من الطول
    if (trimmed.length !== 24) {
      setIdStatus({
        checking: false,
        message: `طول الآيدي ${trimmed.length} من 24 خانة. (يجب أن يكون 24 خانة بالضبط)`,
        isError: true,
        isValidHex: false
      });
      return;
    }

    // 2. التحقق من أحرف الهيكسا
    if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      setIdStatus({
        checking: false,
        message: "الآيدي غير صالح: يجب أن يحتوي فقط على أرقام وحروف Hexadecimal (من 0-9 و a-f)",
        isError: true,
        isValidHex: false
      });
      return;
    }

    // 3. الصيغة هيكسا صحيحة 100% -> فحص عدم التكرار مع السيرفر
    setIdStatus({ checking: true, message: "جاري التحقق من عدم التكرار في قاعدة البيانات...", isError: false, isValidHex: true });
    try {
      const res = await axios.get(`${API_URL}/api/certificates/check-id/${trimmed}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.available) {
        setIdStatus({ checking: false, message: "✅ الآيدي هيكسا صالح ومتاح للاستخدام (غير مكرر)", isError: false, isValidHex: true });
      } else {
        setIdStatus({ checking: false, message: `❌ ${res.data.message}`, isError: true, isValidHex: true });
      }
    } catch (err) {
      setIdStatus({ checking: false, message: "✅ صيغة الآيدي صحيحة (24 خانة Hexadecimal)", isError: false, isValidHex: true });
    }
  };

  // Auto-fill next sequential health certificate number
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const authToken = localStorage.getItem('token') || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);
        const res = await axios.get(`${API_URL}/api/certificates-next-number`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setForm(prev => ({ ...prev, healthCertificateNumber: res.data.nextNumber }));
      } catch (err) {
        console.log('Could not fetch next certificate number', err);
      }
    };
    fetchNextNumber();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "_id" || name === "customId") {
      setForm({ ...form, _id: value, customId: value });
      handleIdValidation(value);
      return;
    }
    if (name === "baladiya") {
      if (value === "OTHER") {
        setIsManualBaladiya(true);
        setForm({ ...form, baladiya: "OTHER" });
      } else {
        setIsManualBaladiya(false);
        setForm({ ...form, baladiya: value });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleManualBaladiyaChange = (e) => {
    setManualBaladiya(e.target.value);
  };

  const handleAmanaChange = (e) => {
    const selectedAmana = e.target.value;
    const selectedData = baladyData[selectedAmana];
    const correspondingLogo = selectedData?.logo || "logos/الرياض.png";
    const availableMunicipalities = selectedData?.municipalities || [];

    setForm({
      ...form,
      amana: selectedAmana,
      baladiya: "", // Reset municipality when Amana changes
      selectedLogo: correspondingLogo
    });
    setMunicipalities(availableMunicipalities);
    setIsManualBaladiya(false);
    setManualBaladiya("");
  };

  const handleLicenseBlur = async () => {
    if (!form.licenseNumber) return;

    try {
      const res = await axios.get(`${API_URL}/api/certificates/license/${form.licenseNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        const data = res.data;

        // Update municipalities based on the fetched amana
        const selectedData = baladyData[data.amana];
        const availableMunicipalities = selectedData?.municipalities || [];

        setMunicipalities(availableMunicipalities);

        setForm(prev => ({
          ...prev,
          establishmentName: data.establishmentName || prev.establishmentName,
          establishmentNumber: data.establishmentNumber || prev.establishmentNumber,
          amana: data.amana || prev.amana,
          baladiya: data.baladiya || prev.baladiya,
          selectedLogo: data.selectedLogo || prev.selectedLogo
        }));

        alert("تم العثور على بيانات لهذه الرخصة وتم تعبئتها تلقائياً");
      }
    } catch (err) {
      // Quietly fail if not found, or maybe just log
      console.log("No existing data for this license");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("amana", form.amana);
      formData.append("baladiya", isManualBaladiya ? manualBaladiya : form.baladiya);
      formData.append("nationalId", form.nationalId);
      formData.append("healthCertificateNumber", form.healthCertificateNumber);
      formData.append("gender", form.gender);
      formData.append("nationality", form.nationality);
      formData.append("job", form.job);
      formData.append("healthCertIssueDate", form.healthCertIssueDate);
      formData.append("healthCertExpiryDate", form.healthCertExpiryDate);
      formData.append("healthCertIssueDateHijri", form.healthCertIssueDateHijri);
      formData.append("healthCertExpiryDateHijri", form.healthCertExpiryDateHijri);
      formData.append("educationalProgram", form.educationalProgram);
      formData.append("educationalProgramEndDate", form.educationalProgramEndDate);
      formData.append("licenseNumber", form.licenseNumber);
      formData.append("establishmentName", form.establishmentName);
      formData.append("establishmentNumber", form.establishmentNumber);
      formData.append("selectedLogo", form.selectedLogo);

      if (photo) {
        formData.append("photo", photo);
      }

      const rawId = (form._id || form.customId || "").trim();
      if (rawId) {
        if (rawId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(rawId)) {
          alert("الآيدي غير صالح: يجب أن يكون مكوناً من 24 خانة بنظام Hexadecimal (أرقام 0-9 وحروف a-f).");
          return;
        }
        if (idStatus.isError && idStatus.message.includes("مستخدم بالفعل")) {
          alert("الآيدي مكرر بالفعل ومسجل لشهادة أخرى في قاعدة البيانات. يرجى اختيار آيدي مختلف.");
          return;
        }
        formData.append("_id", rawId);
        formData.append("customId", rawId);
      }

      const res = await axios.post(
        `${API_URL}/api/certificates`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert("تم إضافة الشهادة بنجاح");
      navigate("/dashboard");

    } catch (err) {
      console.log(err);
      const msg = err.response?.data?.message || err.response?.data?.detail || "فيه خطأ أثناء حفظ الشهادة";
      alert(msg);
    }
  };

  return (
    <div className="add-certificate-container">
      <div className="add-certificate-header">
        <h2>إضافة شهادة صحية جديدة</h2>
      </div>

      <form className="add-certificate-form" onSubmit={handleSubmit}>

        <div style={{
          gridColumn: '1 / -1',
          background: idStatus.isError ? '#fef2f2' : (idStatus.isValidHex && !idStatus.isError ? '#f0fdf4' : '#f8fafc'),
          padding: '16px 20px',
          borderRadius: '10px',
          border: `1.5px solid ${idStatus.isError ? '#f87171' : (idStatus.isValidHex && !idStatus.isError ? '#4ade80' : '#e2e8f0')}`,
          transition: 'all 0.3s ease',
          marginBottom: '5px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ margin: 0, fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
              معرف الشهادة في قاعدة البيانات (_id) - اختياري
            </label>
            <span style={{
              fontSize: '12px',
              color: (form._id || form.customId || '').trim().length === 24 ? '#16a34a' : '#64748b',
              fontWeight: '700',
              direction: 'ltr'
            }}>
              {((form._id || form.customId || '').trim().length)} / 24 hex
            </span>
          </div>
          <input
            type="text"
            name="_id"
            value={form._id || form.customId || ""}
            onChange={handleChange}
            placeholder="مثال: 6512bd349f82d10a23b49102 (24 خانة Hexadecimal - اتركه فارغاً لإنشاء آيدي تلقائي)"
            maxLength={24}
            style={{
              direction: 'ltr',
              textAlign: 'left',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              fontSize: '14px',
              border: `1.5px solid ${idStatus.isError ? '#ef4444' : (idStatus.isValidHex && !idStatus.isError ? '#22c55e' : '#cbd5e1')}`,
              backgroundColor: '#ffffff'
            }}
          />
          {idStatus.message && (
            <div style={{
              marginTop: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: idStatus.isError ? '#dc2626' : '#16a34a'
            }}>
              {idStatus.checking ? '⏳ ' : ''}{idStatus.message}
            </div>
          )}
          {!idStatus.message && (
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              💡 خانة اختيارية: إذا تُركت فارغة، سيقوم MongoDB بإنشاء _id عشوائي فريد تلقائياً.
            </span>
          )}
        </div>

        <div>
          <label>اسم الشخص *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="أدخل الاسم الكامل" required />
        </div>

        <div style={{ gridColumn: '1 / -1', background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0d47a1' }}>بيانات الرخصة (إدخال الرقم يكمل البيانات تلقائياً)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label>رقم الرخصة</label>
              <input
                type="text"
                name="licenseNumber"
                value={form.licenseNumber}
                onChange={handleChange}
                onBlur={handleLicenseBlur}
                placeholder="أدخل رقم الرخصة"
                style={{ border: '2px solid #2196f3' }}
              />
            </div>
            <div>
              <label>اسم المنشأة</label>
              <input type="text" name="establishmentName" value={form.establishmentName} onChange={handleChange} placeholder="أدخل اسم المنشأة" />
            </div>
            <div>
              <label>رقم المنشأة</label>
              <input type="text" name="establishmentNumber" value={form.establishmentNumber} onChange={handleChange} placeholder="أدخل رقم المنشأة" />
            </div>
          </div>
        </div>

        <div>
          <label>الأمانة / المنطقة *</label>
          <select name="amana" value={form.amana} onChange={handleAmanaChange} required>
            <option value="">اختر الأمانة أو المنطقة</option>
            {Object.keys(baladyData).map((amanaName) => (
              <option key={amanaName} value={amanaName}>
                {amanaName}
              </option>
            ))}
          </select>
          {form.amana && form.selectedLogo && (
            <img
              src={`/${form.selectedLogo}`}
              alt="لوجو الأمانة"
              style={{ width: '100px', height: '100px', objectFit: 'contain', marginTop: '10px', border: '1px solid #ddd', padding: '5px', borderRadius: '4px', backgroundColor: 'white' }}
            />
          )}
        </div>

        <div>
          <label>البلدية</label>
          <select name="baladiya" value={form.baladiya} onChange={handleChange} required>
            <option value="">اختر البلدية</option>
            <option value="OTHER">أخرى (إدخال يدوي)</option>
            {municipalities.map((municipality, index) => (
              <option key={index} value={municipality}>
                {municipality}
              </option>
            ))}
          </select>
          {isManualBaladiya && (
            <input
              type="text"
              value={manualBaladiya}
              onChange={handleManualBaladiyaChange}
              placeholder="اكتب اسم البلدية هنا"
              required
              style={{ marginTop: '10px', border: '2px solid #4caf50' }}
            />
          )}
        </div>

        <div>
          <label>رقم الهوية *</label>
          <input type="text" name="nationalId" value={form.nationalId} onChange={handleChange} placeholder="أدخل رقم الهوية" required />
        </div>
        <div>
          <label>الجنس</label>
          <input type="text" name="gender" value={form.gender} onChange={handleChange} placeholder="ذكر / أنثى" />
        </div>

        <div>
          <label>رقم الشهادة الصحية</label>
          <input type="text" name="healthCertificateNumber" value={form.healthCertificateNumber} onChange={handleChange} placeholder="أدخل رقم الشهادة الصحية" />
        </div>

        <div>
          <label>الجنسية</label>
          <input type="text" name="nationality" value={form.nationality} onChange={handleChange} placeholder="أدخل الجنسية" />
        </div>

        <div>
          <label>المهنة</label>
          <input type="text" name="job" value={form.job} onChange={handleChange} placeholder="أدخل المهنة" />
        </div>

        <div>
          <label>تاريخ إصدار الشهادة الصحية</label>
          <input type="text" name="healthCertIssueDate" value={form.healthCertIssueDate} onChange={handleChange} placeholder="YYYY-MM-DD" />
        </div>

        <div>
          <label>تاريخ إصدار الشهادة الصحية (هجري)</label>
          <input type="text" name="healthCertIssueDateHijri" value={form.healthCertIssueDateHijri} onChange={handleChange} placeholder="مثال: 1447-05-01" />
        </div>

        <div>
          <label>تاريخ انتهاء الشهادة الصحية</label>
          <input type="text" name="healthCertExpiryDate" value={form.healthCertExpiryDate} onChange={handleChange} placeholder="YYYY-MM-DD" />
        </div>

        <div>
          <label>تاريخ انتهاء الشهادة الصحية (هجري)</label>
          <input type="text" name="healthCertExpiryDateHijri" value={form.healthCertExpiryDateHijri} onChange={handleChange} placeholder="مثال: 1448-05-01" />
        </div>

        <div>
          <label>نوع البرنامج التثقيفي</label>
          <input type="text" name="educationalProgram" value={form.educationalProgram} onChange={handleChange} placeholder="أدخل نوع البرنامج التثقيفي" />
        </div>

        <div>
          <label>تاريخ انتهاء البرنامج التثقيفي (هجري) *</label>
          <input type="text" name="educationalProgramEndDate" value={form.educationalProgramEndDate} onChange={handleChange} placeholder="تاريخ هجري مثال: 1450-08-05" />
        </div>



        <div>
          <label>صورة الشخص</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
          />
        </div>

        <button type="submit" className="add-certificate-btn">✓ حفظ الشهادة</button>
      </form>
    </div>
  );
}

export default AddCertificate;
