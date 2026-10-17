import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const DownloadPdfButton = ({ certificate, certTopRef, certFooterRef, setIsPrinting }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const navigate = useNavigate();

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setIsPrinting(true);
    document.body.classList.add('pdf-printing');

    try {
      // Delay to ensure layout stabilizer at 1:1 scale
      await new Promise(r => setTimeout(r, 1000));

      const pdfWidth = 297; // A4 Landscape
      const pdfHeight = 210;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise(r => setTimeout(r, 1500))
        ]);
      }
      
      const topEl = certTopRef.current;
      const footerEl = certFooterRef.current;
      
      if (!topEl) {
        throw new Error("عنصر الشهادة غير متوفر");
      }

      const topRatio = topEl.offsetHeight / topEl.offsetWidth;

      // Find QR link coordinates
      const topRect = topEl.getBoundingClientRect();
      const qrEl = topEl.querySelector('.cert-qr-box a');
      const qrCanvas = topEl.querySelector('.cert-qr-box canvas');
      let qrLink = null;
      if (qrEl && qrCanvas && topRect.width > 0) {
        const qrRect = qrCanvas.getBoundingClientRect();
        qrLink = {
          url: qrEl.href,
          x: (qrRect.left - topRect.left) / topRect.width,
          y: (qrRect.top - topRect.top) / topRect.height,
          w: qrRect.width / topRect.width,
          h: qrRect.height / topRect.height
        };
      }

      // Render Page 1 (high quality - exact original rendering)
      const topDataUrl = await toPng(topEl, { cacheBust: true, pixelRatio: 3, quality: 1 });
      const topDrawHeight = pdfWidth * topRatio;
      const topDrawY = (pdfHeight - topDrawHeight) / 2;
      pdf.addImage(topDataUrl, "PNG", 0, topDrawY, pdfWidth, topDrawHeight);

      if (qrLink) {
        // Draw invisible text to force mobile/desktop PDF viewers to register the link
        pdf.setTextColor(255, 255, 255); // White text
        pdf.setFontSize(2);
        const linkX = qrLink.x * pdfWidth;
        const linkY = topDrawY + (qrLink.y * topDrawHeight);
        const linkW = qrLink.w * pdfWidth;
        const linkH = qrLink.h * topDrawHeight;
        
        pdf.textWithLink('QR', linkX + 2, linkY + 4, { url: qrLink.url });
        pdf.link(linkX, linkY, linkW, linkH, { url: qrLink.url });
      }

      // Render Page 2 (high quality - exact original rendering)
      if (footerEl) {
        const targetFooterPixelHeight = footerEl.offsetWidth * (pdfHeight / pdfWidth);
        const footerDataUrl = await toPng(footerEl, { 
          cacheBust: true, 
          pixelRatio: 3, 
          quality: 1,
          height: targetFooterPixelHeight
        });
        const footerDrawHeight = pdfHeight;
        const footerDrawY = 0;
        pdf.addPage();
        pdf.addImage(footerDataUrl, "PNG", 0, footerDrawY, pdfWidth, footerDrawHeight);
      }

      const safeName = (certificate.name || certificate.healthCertificateNumber || certificate.id || 'health-cert')
        .replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `certificate-${safeName}.pdf`;

      // Detect mobile devices strictly
      const isIOS = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid || (typeof navigator !== 'undefined' && /webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

      if (isMobile) {
        // Mobile: try native Share API (allows saving to files / direct share), fallback to pdf.save
        let shared = false;
        try {
          const pdfBlob = pdf.output('blob');
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'الشهادة الصحية',
              text: 'شهادة صحية موحدة'
            });
            shared = true;
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            shared = true;
          } else {
            console.warn('Mobile Web Share API error, using standard download:', shareErr);
          }
        }

        if (!shared) {
          pdf.save(fileName);
        }
      } else {
        // Desktop / PC / Laptop: ALWAYS download directly to computer!
        pdf.save(fileName);
      }

    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("حدث خطأ أثناء تحميل الملف. الرجاء المحاولة مرة أخرى.");
    } finally {
      document.body.classList.remove('pdf-printing');
      setIsGeneratingPdf(false);
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={isGeneratingPdf}
      style={{ backgroundColor: '#2c3e50', color: 'white', cursor: isGeneratingPdf ? 'not-allowed' : 'pointer' }}
    >
      {isGeneratingPdf ? 'جاري التحميل...' : '📥 تحميل PDF'}
    </button>
  );
};

export default DownloadPdfButton;
