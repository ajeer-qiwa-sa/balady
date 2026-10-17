import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CiGlobe } from "react-icons/ci";
import { FaTwitter, FaYoutube, FaFacebookF } from "react-icons/fa";
import { FaPhone } from "react-icons/fa6";
import "../styles/CertificatePage.css";
import DownloadPdfButton from "../components/DownloadPdfButton";
import QRCodeStyling from "qr-code-styling";
import { API_URL } from "../api";
import starIcon from "../star.png";

// ============================================================
//  QR redirect host — the ONLY place this value lives.
//  The QR codes encode THIS page's URL (stable), and qr-redirect/
//  forwards to the current frontend + backend. When the GitHub Pages
//  URL changes, update this one line (no trailing slash).
// ============================================================
const REDIRECT_BASE = "https://service-balady-gov.github.io/view";

// Single source of truth for the QR target: the stable redirect URL that
// carries the certificate id + type. Used by both the QR image and the
// clickable link wrapping it, so they can never point to different places.
const buildRedirectUrl = (id, certificateType) => {
  const typeValue = certificateType === 'delivery' ? 'delivery' : `${certificateType}-certificate`;
  return `${REDIRECT_BASE}/?id=${encodeURIComponent(id)}&type=${encodeURIComponent(typeValue)}`;
};

const formatToHijri = (hijriStr, gregStr) => {
  if (hijriStr) {
    try {
      const dateOnly = hijriStr.split('T')[0];
      const parts = dateOnly.split('-');
      if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
      const d = new Date(hijriStr);
      if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${yyyy}/${mm}/${dd}`;
      }
      return hijriStr;
    } catch (e) {
      return hijriStr;
    }
  }

  if (gregStr) {
    try {
      const date = new Date(gregStr);
      if (isNaN(date.getTime())) return '';
      const options = { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'islamic-umalqura' };
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', options).formatToParts(date);
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      if (y && m && d) return `${y}/${m}/${d}`;

      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${yyyy}/${mm}/${dd}`;
    } catch (e) {
      try {
        const date2 = new Date(gregStr);
        if (!isNaN(date2)) {
          const dd2 = String(date2.getDate()).padStart(2, '0');
          const mm2 = String(date2.getMonth() + 1).padStart(2, '0');
          const yyyy2 = date2.getFullYear();
          return `${yyyy2}/${mm2}/${dd2}`;
        }
      } catch (err) { }
      return gregStr;
    }
  }
  return '';
};

// ==========================================
// CERTIFICATE CONFIGURATIONS AND VARIANTS
// ==========================================
const CERTIFICATE_TYPES = {
  annual: {
    id: 'annual',
    name: 'شهادة صحية سنوية',
    color: '#42ce23ff',
    headerColor: '#42ce23ff',
    className: 'variant-annual',
    fields: [
      { key: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { key: 'nationality', label: 'الجنسية', type: 'text' },
      { key: 'healthCertificateNumber', label: 'رقم الشهادة الصحية', type: 'text' },
      { key: 'job', label: 'المهنة', type: 'text' },
      { key: 'healthCertIssueDate', hijriKey: 'healthCertIssueDateHijri', label: 'تاريخ إصدار الشهادة الصحية', type: 'date' },
      { key: 'healthCertExpiryDate', hijriKey: 'healthCertExpiryDateHijri', label: 'تاريخ نهاية الشهادة الصحية', type: 'date' }
    ],
    instructions: [
      'شهادة صحية تجدد سنوياً.',
      'هذه الشهادة لا تخول لك العمل في تداول الغذاء أو أعمال تتعلق بالصحة العامة.',
      'إذا رغبت العمل في تداول الغذاء أو أعمال الصحة العامة فأنت ملزم باجتياز اختبار التثقيف الصحي وفق الإجراءات المنظمة',
      'لا تعتبر الشهادة إثبات هوية.'
    ],
    baseFontSize: '38px',
    fontWeight: '700'
  },
  basic: {
    id: 'basic',
    name: 'شهادة صحية',
    color: '#89c869',
    headerColor: '#7bbc47',
    className: 'variant-basic',
    fields: [
      { key: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { key: 'nationality', label: 'الجنسية', type: 'text' },
      { key: 'healthCertificateNumber', label: 'رقم الشهادة الصحية', type: 'text' },
      { key: 'job', label: 'المهنة', type: 'text' },
      { key: 'healthCertIssueDate', hijriKey: 'healthCertIssueDateHijri', label: 'تاريخ إصدار الشهادة الصحية', type: 'date' },
      { key: 'healthCertExpiryDate', hijriKey: 'healthCertExpiryDateHijri', label: 'تاريخ نهاية الشهادة الصحية', type: 'date' }
    ],
    instructions: [
      'شهادة صحية تجدد سنوياً.',
      'هذه الشهادة لا تخول لك العمل في تداول الغذاء أو أعمال تتعلق بالصحة العامة.',
      'اذا رغبت العمل في تداول الغذاء أو أعمال الصحة العامة فأنت ملزم باجتياز اختبار التثقيف الصحي وفق الإجراءات المنظمة.',
      'لا تعتبر الشهادة إثبات هوية.'
    ],
    baseFontSize: '24px',
    fontWeight: '500'
  },
  health: {
    id: 'health',
    name: 'شهادة صحية',
    color: '#4a8483',
    headerColor: '#0e726f',
    className: 'variant-health',
    fields: [
      { key: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { key: 'nationality', label: 'الجنسية', type: 'text' },
      { key: 'healthCertificateNumber', label: 'رقم الشهادة الصحية', type: 'text' },
      { key: 'job', label: 'المهنة', type: 'text' },
      { key: 'healthCertIssueDate', hijriKey: 'healthCertIssueDateHijri', label: 'تاريخ إصدار الشهادة الصحية', type: 'date' },
      { key: 'healthCertExpiryDate', hijriKey: 'healthCertExpiryDateHijri', label: 'تاريخ نهاية الشهادة الصحية', type: 'date' },
      { key: 'educationalProgram', label: 'نوع البرنامج التثقيفي', type: 'text' },
      { key: 'educationalProgramEndDate', hijriKey: 'educationalProgramEndDate', label: 'تاريخ انتهاء البرنامج التثقيفي', type: 'date' }
    ],
    instructions: [
      'شهادة صحية تجدد سنوياً.',
      'هذه الشهادة تسمح لك بالعمل في تداول الغذاء أو أعمال تتعلق بالصحة العامة.',
      'لا تعتبر الشهادة إثبات هوية.'
    ],
    baseFontSize: '20px',
    fontWeight: '500'
  },
  unified: {
    id: 'unified',
    name: 'الشهادة الصحية الموحدة',
    color: '#4a8483',
    headerColor: '#0e726f',
    className: 'variant-unified',
    fields: [
      { key: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { key: 'nationality', label: 'الجنسية', type: 'text' },
      { key: 'healthCertificateNumber', label: 'رقم الشهادة الصحية', type: 'text' },
      { key: 'job', label: 'المهنة', type: 'text' },
      { key: 'healthCertIssueDate', hijriKey: 'healthCertIssueDateHijri', label: 'تاريخ إصدار الشهادة الصحية', type: 'date' },
      { key: 'healthCertExpiryDate', hijriKey: 'healthCertExpiryDateHijri', label: 'تاريخ نهاية الشهادة الصحية', type: 'date' },
      { key: 'educationalProgram', label: 'نوع البرنامج التثقيفي', type: 'text' },
      { key: 'educationalProgramEndDate', hijriKey: 'educationalProgramEndDate', label: 'تاريخ انتهاء البرنامج التثقيفي', type: 'date' }
    ],
    instructions: [
      'شهادة صحية تجدد سنوياً.',
      'يسمح لحامل الشهادة الصحية بالعمل في منشات الغذاء او الصحة العامة وفق المهنة المسموح بها نظاما.',
      'يلزم حامل هذه الشهادة بإجراء فحص طبي عند عودته من الخارج قبل البدء بممارسة العمل.',
      'لا تعتبر الشهادة إثبات هوية.'
    ],
    baseFontSize: '20px',
    fontWeight: '400'
  },
  delivery: {
    id: 'delivery',
    name: 'شهادة صحية',
    subtitle: 'لموصلي الطعام عبر تطبيقات التوصيل',
    color: '#4189a9',
    headerColor: '#4189a9',
    className: 'variant-delivery',
    fields: [
      { key: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { key: 'nationality', label: 'الجنسية', type: 'text' },
      { key: 'healthCertificateNumber', label: 'رقم الشهادة الصحية', type: 'text' },
      { key: 'job', label: 'المهنة', type: 'text' },
      { key: 'healthCertIssueDate', hijriKey: 'healthCertIssueDateHijri', label: 'تاريخ إصدار الشهادة الصحية', type: 'date' },
      { key: 'healthCertExpiryDate', hijriKey: 'healthCertExpiryDateHijri', label: 'تاريخ نهاية الشهادة الصحية', type: 'date' }
    ],
    instructions: [
      'شهادة صحية تجدد سنوياً.',
      'يقتصر العمل بهذه الشهادة في توصيل الطعام عبر تطبيقات الموبايل فقط.',
      'لا تستخدم هذه الشهادة للعمل في منشآت الغذاء والصحة العامة.',
      'عند عدم تجديد الشهادة الصحية خلال المدة الممنوحة (15) يوماً بعد انتهائها تلغى تلقائياً.',
      'لا تعتبر الشهادة إثبات هوية.'
    ],
    baseFontSize: '26px',
    fontWeight: '500'
  }
};


const CertificatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [certificateType, setCertificateType] = useState('unified');
  const [isPrinting, setIsPrinting] = useState(false);
  
  const currentVariant = CERTIFICATE_TYPES[certificateType] || CERTIFICATE_TYPES.unified;
  
  const certRef = useRef();
  const certTopRef = useRef(null);
  const certFooterRef = useRef(null);
  const qrContainerRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const nameRef = useRef(null);

  // Renders each field — always shows the row (empty box if no data)
  const renderField = (field, certData) => {
    let rawValue = certData[field.key];
    let displayValue = '';

    if (field.type === 'date') {
      const hijriVal = field.hijriKey ? certData[field.hijriKey] : null;
      displayValue = formatToHijri(hijriVal, rawValue) || '';
    } else {
      // Default value for educationalProgram if empty
      if (field.key === 'educationalProgram' && !rawValue) {
        displayValue = 'منشآت الغذاء';
      } else {
        displayValue = rawValue || '';
      }
    }

    return (
      <div className="info-row" key={field.key}>
        <span>{field.label}</span>
        <p>{displayValue || '\u00A0'}</p>
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/certificates/${id}`);
        setCertificate(res.data);
        // Sync the UI variant with the loaded data type
        if (res.data.type && CERTIFICATE_TYPES[res.data.type]) {
          setCertificateType(res.data.type);
        }
      } catch (err) {
        console.error("Error fetching certificate:", err);
        if (err.response?.status === 401) {
          alert("خطأ في المصادقة - الرجاء تسجيل الدخول مرة أخرى");
        } else if (err.response?.status === 404) {
          alert("الشهادة غير موجودة");
        }
      }
    };
    fetchData();
  }, [id]);



  // Initialize or update styled QR code
  useEffect(() => {
    if (!certificate) return;

    // Encode the STABLE redirect URL (not window.location) so QR codes keep
    // working even when the frontend domain changes. qr-redirect forwards to
    // <frontend>/view/<id>?type=<type>&api=<backend>.
    const dataUrl = buildRedirectUrl(certificate._id, certificateType);


    if (!qrInstanceRef.current) {
      qrInstanceRef.current = new QRCodeStyling({
        width: 150,
        height: 150,
        type: "canvas",
        data: dataUrl,
        margin: 10,
        dotsOptions: { type: "square", color: "#040404ff" },
        cornersSquareOptions: { type: "square", color: "#010101ff" },
        cornersDotOptions: { type: "square", color: "#000000ff" },
        backgroundOptions: { color: "#ffffff" },
        qrOptions: {
          errorCorrectionLevel: "M",
        },
      });
      if (qrContainerRef.current) {
        qrInstanceRef.current.append(qrContainerRef.current);
      }
    } else {
      qrInstanceRef.current.update({ data: dataUrl });
    }

    const canvas = qrContainerRef.current.querySelector("canvas");

        if (canvas) {
          canvas.style.padding = "10px";
        }
  }, [certificate, certificateType]);
  // Auto-fit name on one line
  useEffect(() => {
    if (!nameRef.current || !certificate?.name) return;

    const applyFit = () => {
      const el = nameRef.current;
      if (!el) return;

      const isAr = /[\u0600-\u06FF]/.test(certificate.name || '');
      const isBasic = certificateType === 'basic';
      const isDelivery = certificateType === 'delivery';

      // Reset to target values for fresh measurement based on script language & variant type
      el.style.width = 'max-content';
      if (isBasic) {
        if (isAr) {
          el.style.fontSize = '21px';
          el.style.fontWeight = '650';
          el.style.letterSpacing = '1px';
          el.style.wordSpacing = '1.5px';
        } else {
          el.style.fontSize = '22px';
          el.style.fontWeight = '600';
          el.style.letterSpacing = '0px';
          el.style.wordSpacing = '0px';
        }
      } else if (isDelivery) {
        el.style.fontSize = '19px';
        el.style.fontWeight = '620';
        el.style.letterSpacing = '0px';
        el.style.wordSpacing = '0px';
      } else {
        // Original behavior for other variants
        el.style.fontSize = currentVariant?.baseFontSize || '38px';
        el.style.fontWeight = currentVariant?.fontWeight || '700';
        el.style.letterSpacing = isAr ? '0px' : '2px';
        el.style.wordSpacing = isAr ? '0px' : '6px';
      }

      const maxWidth = el.parentElement.clientWidth - 10;
      if (maxWidth <= 50) return;

      // 1. Shrink word spacing if needed
      while (el.scrollWidth > maxWidth) {
        const cur = parseFloat(el.style.wordSpacing || 0);
        const limit = (isBasic || isDelivery) ? (isAr ? 0.2 : 0) : 0.2;
        if (cur <= limit) break;
        el.style.wordSpacing = (cur - 0.2).toFixed(1) + 'px';
      }

      // 2. Shrink letter spacing if needed
      while (el.scrollWidth > maxWidth) {
        const cur = parseFloat(el.style.letterSpacing || 0);
        const limit = (isBasic || isDelivery) ? (isAr ? 0 : -0.5) : -0.5;
        if (cur <= limit) break;
        el.style.letterSpacing = (cur - 0.1).toFixed(1) + 'px';
      }

      // 3. Shrink font size if still needed
      while (el.scrollWidth > maxWidth && parseFloat(el.style.fontSize) > 12) {
        el.style.fontSize = (parseFloat(el.style.fontSize) - 0.5) + 'px';
      }
      
      el.style.width = '100%'; 
    };

    const timer = setTimeout(() => {
      document.fonts.ready.then(applyFit);
    }, 200);

    return () => clearTimeout(timer);
  }, [certificate, certificateType, currentVariant]);

  if (!certificate) return <p style={{ textAlign: "center" }}>Loading…</p>;



  return (
    <>
      <div className={`cert-container ${currentVariant.className}`}>
        <div className="cert-wrapper">

          {/* Certificate Variant Selector */}
          <div className="cert-type-selector">
            {Object.keys(CERTIFICATE_TYPES).map((key) => {
              const variant = CERTIFICATE_TYPES[key];
              const isActive = certificateType === key;
              return (
                <button
                  key={key}
                  className={`type-button ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundColor: isActive ? variant.color : 'transparent',
                    borderColor: variant.color,
                    color: isActive ? '#fff' : variant.color
                  }}
                  onClick={() => setCertificateType(key)}
                >
                  {variant.subtitle
                    ? `${variant.name} ${variant.subtitle}`
                    : variant.name}
                </button>
              );
            })}
          </div>

          <div className="cert-card" ref={certRef}>
            <div className="containerTop" ref={certTopRef}>
              {/* TOP HEADER + LOGOS */}
              <div className="header-section">
                <div className="cert-header">
                  <div className="cert-logo-wrapper cert-logo-wrapper-1">
                    <img src="/logo1.png" alt="logo1" className="cert-logo cert-logo-1" />
                  </div>
                  <div className="cert-logo-wrapper cert-logo-wrapper-2">
                    <img src="/logo3.png" alt="logo2" className="cert-logo cert-logo-2" />
                  </div>
                  <div className="cert-logo-wrapper cert-logo-wrapper-3">
                    <img
                      src={`/${certificate.selectedLogo || "logo2.png"}`}
                      alt="selected logo"
                      className="cert-logo cert-logo-3"
                    />
                  </div>
                </div>
                <div
                  className="header-color"
                  style={{ backgroundColor: currentVariant.headerColor || currentVariant.color }}
                >
                  <h1 className="main-title">{currentVariant.name}</h1>
                  {currentVariant.subtitle && (
                    <p className="main-subtitle">{currentVariant.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="cert-top-section">
                <div className="cert-left">
                  <div className="cert-photo-box">
                    {certificate.photoUrl && (
                      <img
                        className="cert-photo"
                        src={certificate.photoUrl}
                        alt="person"
                      />
                    )}
                  </div>

                  <div className="cert-qr-box">
                    <a
                      href={buildRedirectUrl(certificate._id, certificateType)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="اضغط لفتح صفحة الشهادة (محاكاة المسح)"
                      style={{ display: 'block', cursor: 'pointer' }}>
                      <div ref={qrContainerRef} />
                    </a>
                    <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '2px' }}></div>
                  </div>
                </div>

                <div className="cert-right">
                  <h2
                    className={`cert-name ${/[\u0600-\u06FF]/.test(certificate.name || '') ? 'cert-name-ar' : 'cert-name-en'}`}
                    ref={nameRef}
                  >
                    {certificate.name}
                  </h2>
                  <div className="cert-info-grid">
                    {currentVariant.fields.map((field) => renderField(field, certificate))}
                  </div>
                </div>
              </div>

              <div className="links" style={{ borderColor: currentVariant.color }}>
                <div className="link-item">
                  <span className="link-text">www.balady.gov.sa</span>
                  <span className="icon-wrapper"><CiGlobe /></span>
                </div>

                <div className="link-item">
                  <span className="link-text">saudimomra</span>
                  <div className="icon-social-group">
                    <span className="icon-wrapper"><FaTwitter /></span>
                    <span className="icon-wrapper"><FaFacebookF /></span>
                    <span className="icon-wrapper"><FaYoutube /></span>
                  </div>
                </div>

                <div className="link-item">
                  <span className="link-text">Balady_cs</span>
                  <span className="icon-wrapper"><FaTwitter /></span>
                </div>

                <div className="footer-line-divider"></div>

                <div className="link-item tel">
                  <span className="label">مركز العناية بالعملاء</span>
                  <span className="num">199040</span>
                  <span className="icon-wrapper"><FaPhone /></span>
                </div>
              </div>
            </div>

            {/* FOOTER SECTION */}
            <div
              className="cert-footer"
              ref={certFooterRef}
              style={{ backgroundColor: currentVariant.color }}
            >
              <img
                src="/back.png"
                alt=""
                className="cert-footer-watermark"/>
              <div className="cert-footer-header">
                <div className="cert-footer-logos">
                  <img src="/vision_logo_new.png" alt="Vision Logo" className="cert-footer-logo" />
                  <div className="cert-footer-ministry-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/ministry_text.png" alt="Ministry Text" className="cert-footer-text-logo" />
                    <div className="cert-footer-palm">
                      <img src="/footer_palm_icon.png" alt="palm" className="palm-icon" />
                    </div>
                  </div>
                </div>
                <h2 className="cert-footer-title">تعليمات وإرشادات</h2>
              </div>

              <div className="cert-footer-content">
                {currentVariant.instructions?.map((instruction, index) => (
                  <div className="cert-instruction-item-block" key={index}>
                    <img src={starIcon} className="cert-star-icon-abs" alt="star" />
                    <p className="cert-instruction-text">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="cert-actions">
            <DownloadPdfButton 
              certificate={certificate} 
              certTopRef={certTopRef} 
              certFooterRef={certFooterRef} 
              setIsPrinting={setIsPrinting} 
            />
            <button
              onClick={() => navigate('/dashboard')}
              style={{ backgroundColor: '#6c757d', color: 'white' }}
            >
              🔙 العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificatePage;
