
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import "../styles/CertificateView.css";
import { API_URL } from "../api";

const CertificateView = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [certificate, setCertificate] = useState(null);

  // Title changes based on the certificate type passed in the QR/URL query params
  const viewTitle =
    searchParams.get("type") === "delivery"
      ? "شهادة صحية لموصلي الطعام عبر تطبيقات التوصيل"
      : "شهادة صحية للأنشطة التجارية";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/certificates/${id}`);
        setCertificate(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [id]);

  // If the certificate is locked, redirect the user to the support WhatsApp number
  useEffect(() => {
    if (certificate && certificate.isLocked) {
      window.location.href = "https://wa.me/966542654909";
    }
  }, [certificate]);

  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.certificate-view-container');
      if (container) {
        if (window.scrollY > 40) {
          container.classList.add('scrolled-mode');
        } else {
          container.classList.remove('scrolled-mode');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!certificate) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>جاري تحميل الشهادة...</p>
      </div>
    );
  }

  if (certificate.isLocked) {
    // Locked certificates redirect straight to WhatsApp; render nothing.
    return null;
  }

  return (
    <>
      <Header />
      <div className="certificate-view-container">
        <div className="certificate-view-card">

          <div className="certificate-view-title-group">
            <h2 className="certificate-view-title-ar">
              {viewTitle}
            </h2>
          </div>

          <div className="certificate-content-wrapper">
            <div className="certificate-view-photo-container">
              {certificate.photoUrl ? (
                <img
                  src={certificate.photoUrl}
                  alt="Photo"
                  className="certificate-view-photo"
                />
              ) : (
                <div className="photo-placeholder">لا توجد صورة</div>
              )}
            </div>

            <div className="certificate-view-info-grid">
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">الأمانة</span>
                <input className="input-box" type="text" value={certificate.amana || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">البلدية</span>
                <input className="input-box" type="text" value={certificate.baladiya || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">الإسم</span>
                <input className="input-box" type="text" value={certificate.name || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">رقم الهوية</span>
                <input className="input-box" type="text" value={certificate.nationalId || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">الجنس</span>
                <input className="input-box" type="text" value={certificate.gender || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">الجنسية</span>
                <input className="input-box" type="text" value={certificate.nationality || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">رقم الشهادة الصحية</span>
                <input className="input-box" type="text" value={certificate.healthCertificateNumber || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">المهنة</span>
                <input className="input-box" type="text" value={certificate.job || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">تاريخ إصدار الشهادة الصحية هجري</span>
                <input className="input-box" type="text" value={certificate.healthCertIssueDateHijri || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">تاريخ إصدار الشهادة الصحية ميلادي</span>
                <input className="input-box" type="text" value={certificate.healthCertIssueDate ? new Date(certificate.healthCertIssueDate).toISOString().split('T')[0].replace(/-/g, '/') : ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">تاريخ نهاية الشهادة الصحية هجري</span>
                <input className="input-box" type="text" value={certificate.healthCertExpiryDateHijri || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">تاريخ نهاية الشهادة الصحية ميلادي</span>
                <input className="input-box" type="text" value={certificate.healthCertExpiryDate ? new Date(certificate.healthCertExpiryDate).toISOString().split('T')[0].replace(/-/g, '/') : ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">نوع البرنامج التثقيفي</span>
                <input className="input-box" type="text" value={certificate.educationalProgram || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">تاريخ إنتهاء البرنامج التثقيفي</span>
                <input className="input-box" type="text" value={certificate.educationalProgramEndDate ? new Date(certificate.educationalProgramEndDate).toISOString().split('T')[0].replace(/-/g, '/') : ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">رقم الرخصة</span>
                <input className="input-box" type="text" value={certificate.licenseNumber || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">إسم المنشأة</span>
                <input className="input-box" type="text" value={certificate.establishmentName || ''} readOnly />
              </div>
              <div className="certificate-view-info-row">
                <span className="certificate-view-label">رقم المنشأة</span>
                <input className="input-box" type="text" value={certificate.establishmentNumber || ''} readOnly />
              </div>
              <div className="certificate-view-info-row" style={{ visibility: 'hidden' }}>
                <span className="certificate-view-label">فارغ</span>
                <input className="input-box" type="text" value="" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Main Footer - Extracted from Target Site */}
      <footer className="main-footer">
        <div className="container">
          <div className="row">
            <div className="col">
              <div className="region region-copyright d-flex justify-content-between align-items-center flex-wrap">
                <div id="block-balady-new-copyright" className="Copyright block block-block-content">
                  <div className="block-content">
                    <div className="clearfix text-formatted field field--name-body field--type-text-with-summary field--label-hidden field__item">
                      <div className="copyright-contents">
                        <div className="footer-links">
                          <a className="menu-item" href="https://balady.gov.sa/ar/sitemap" aria-label="خريطة الموقع">خريطة الموقع</a>
                          <a className="menu-item" href="https://balady.gov.sa/en/rss.xml" aria-label="RSS">RSS</a>
                          <a className="menu-item" href="https://balady.gov.sa/ar/node/22490" aria-label="شروط الاستخدام">شروط الاستخدام</a>
                        </div>
                        <p>جميع الحقوق محفوظة لوزارة البلديات والإسكان © 2026</p>
                        <p>تم تطويره وصيانته بواسطة وزارة البلديات والإسكان</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div id="block-balady-new-logos" className="logos block block-block-content mt-3 mt-md-0">
                  <div className="block-content">
                    <div className="clearfix text-formatted field field--name-body field--type-text-with-summary field--label-hidden field__item">
                      <div className="footer-logos">
                        <a href="https://www.vision2030.gov.sa/" className="vision-logo" rel="nofollow noreferrer" aria-label="رؤية 2030" title="رؤية 2030">
                          <img src="https://balady.momra.gov.sa/themes/custom/balady_new/images/footer_logos.svg" alt="balady" title="رؤية 2030" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default CertificateView;
