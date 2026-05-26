import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { parseHealthReportPdf } from '../utils/pdfParser';
import type { HealthReportData } from '../utils/pdfParser';

interface FileUploaderProps {
  onReportsParsed: (newReports: HealthReportData[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onReportsParsed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = async (files: FileList) => {
    setLoading(true);
    setErrors([]);
    setSuccessCount(0);
    const parsedData: HealthReportData[] = [];
    const newErrors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
        newErrors.push(`${file.name}: Dosya tipi PDF olmalıdır.`);
        continue;
      }
      
      try {
        const data = await parseHealthReportPdf(file);
        parsedData.push(data);
      } catch (err: any) {
        console.error("PDF Parsing Error:", err);
        newErrors.push(`${file.name} ayrıştırılamadı: ${err.message || 'Geçersiz PDF formatı'}`);
      }
    }
    
    if (parsedData.length > 0) {
      onReportsParsed(parsedData);
      setSuccessCount(parsedData.length);
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
    }
    
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="uploader-container">
      <div 
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={inputRef}
          type="file" 
          multiple 
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="hidden-file-input"
        />
        
        {loading ? (
          <div className="upload-state">
            <RefreshCw className="animate-spin text-teal size-12" />
            <h3>Raporlar Ayrıştırılıyor...</h3>
            <p>Samsung Health PDF verileri analiz ediliyor, lütfen bekleyin.</p>
          </div>
        ) : (
          <div className="upload-state" onClick={onButtonClick}>
            <Upload className="text-teal size-12 upload-icon" />
            <h3>Samsung Health PDF Raporlarını Yükleyin</h3>
            <p>PDF dosyalarını buraya sürükleyip bırakın veya <span>dosya seçmek için tıklayın</span></p>
            <span className="file-info-hint">Aynı anda birden fazla PDF yükleyerek geçmiş trendleri analiz edebilirsiniz.</span>
          </div>
        )}
      </div>

      {successCount > 0 && (
        <div className="alert success-alert">
          <CheckCircle2 className="alert-icon text-green" />
          <div>
            <h4>Başarılı!</h4>
            <p>{successCount} adet günlük sağlık raporu başarıyla sisteme eklendi ve grafikleştirildi.</p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert error-alert">
          <AlertCircle className="alert-icon text-red" />
          <div>
            <h4>Bazı hatalar oluştu:</h4>
            <ul>
              {errors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
