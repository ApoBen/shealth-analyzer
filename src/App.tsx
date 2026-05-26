import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { ReportDetail } from './components/ReportDetail';
import type { HealthReportData } from './utils/pdfParser';
import { Activity, LayoutDashboard, PlusCircle, Database, ShieldAlert, HeartHandshake } from 'lucide-react';
import './App.css';

// Local storage key
const STORAGE_KEY = 'shealth_reports';

export const App: React.FC = () => {
  const [reports, setReports] = useState<HealthReportData[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Re-convert date strings back to Date objects
        const formatted = parsed.map((r: any) => ({
          ...r,
          date: new Date(r.date)
        }));
        setReports(formatted);
        setActiveTab('dashboard');
      } catch (e) {
        console.error("Local storage load failed", e);
      }
    }
  }, []);

  // Save to local storage on change
  const saveReports = (updatedReports: HealthReportData[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReports));
    setReports(updatedReports);
  };

  const handleReportsParsed = (newReports: HealthReportData[]) => {
    // Avoid duplicates by date
    const filteredNew = newReports.filter(newR => 
      !reports.some(oldR => oldR.dateStr === newR.dateStr)
    );

    const merged = [...reports, ...filteredNew];
    saveReports(merged);
    
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveTab('dashboard');
    }, 1500); // 1.5 second loading animation
  };

  const handleClearData = () => {
    if (window.confirm("Tüm yüklenmiş rapor verilerini silmek istediğinize emin misiniz?")) {
      localStorage.removeItem(STORAGE_KEY);
      setReports([]);
      setSelectedReportId(null);
      setActiveTab('upload');
    }
  };

  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(reports, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `shealth_data_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      alert("Veriler dışa aktarılırken hata oluştu: " + e);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) {
          throw new Error("Yedek dosyası bir dizi içermelidir.");
        }
        
        // Format dates
        const formatted = parsed.map((r: any) => ({
          ...r,
          date: new Date(r.date)
        }));

        // Merge and avoid duplicates by dateStr
        const merged = [...reports];
        let importedCount = 0;
        formatted.forEach((newR: HealthReportData) => {
          if (!merged.some(oldR => oldR.dateStr === newR.dateStr)) {
            merged.push(newR);
            importedCount++;
          }
        });

        saveReports(merged);
        setActiveTab('dashboard');
        alert(`${importedCount} adet yeni rapor başarıyla içe aktarıldı.`);
      } catch (err: any) {
        alert("JSON dosyası okunamadı veya geçersiz format: " + err.message);
      }
    };
    fileReader.readAsText(file, "UTF-8");
    // Reset input
    event.target.value = '';
  };

  const loadSampleData = () => {
    const sample: HealthReportData[] = [
      {
        id: 'sample-1',
        fileName: 'HealthReport_2026_05_22.pdf',
        dateStr: '22 Mayıs 2026',
        date: new Date(2026, 4, 22),
        nickname: 'Ahmet',
        birthDate: '1992-06-15',
        gender: 'GENDER_MALE',
        heightCm: 182,
        weightKg: 78.5,
        steps: { totalSteps: 8540, goalSteps: 8000, distanceKm: 6.2 },
        floors: { floorsClimbed: 6, goalFloors: 10 },
        heartRate: { averageBpm: 72, minBpm: 58, maxBpm: 135, restingBpm: 60 },
        energyScore: 78,
        calories: { totalCalories: 2350, activeCalories: 450, restCalories: 1900 },
        sleep: {
          totalDurationMinutes: 440,
          sleepScore: 75,
          startTime: '23:15',
          endTime: '06:35',
          remMinutes: 80,
          lightSleepMinutes: 260,
          deepSleepMinutes: 80,
          awakeMinutes: 20
        },
        waterIntake: { amountMl: 1750, goalMl: 2000 },
        bodyComposition: { weightKg: 78.5, heightCm: 182, bodyFatPercentage: 16.5, skeletalMuscleMassKg: 36.8, bmi: 23.7 },
        nutrition: { calories: 2150, carbsGrams: 260, proteinGrams: 110, fatGrams: 75, fiberGrams: 22 },
        bloodPressure: [
          { time: '08:30', systolic: 118, diastolic: 76, pulse: 64 },
          { time: '20:15', systolic: 121, diastolic: 78, pulse: 70 }
        ],
        bloodOxygen: [
          { time: '08:35', spo2: 98 },
          { time: '20:20', spo2: 97 }
        ],
        bloodGlucose: [
          { time: '08:00', glucose: 95, mealType: 'FASTING' },
          { time: '13:30', glucose: 115, mealType: 'AFTER_LUNCH' }
        ],
        skinTemperatureAvg: 35.6,
        sleepApneaSeverity: 'NOT_DETECTED',
        workouts: [
          { type: 'Yürüyüş', durationMinutes: 40, caloriesBurned: 180, distanceKm: 3.5 }
        ]
      },
      {
        id: 'sample-2',
        fileName: 'HealthReport_2026_05_23.pdf',
        dateStr: '23 Mayıs 2026',
        date: new Date(2026, 4, 23),
        nickname: 'Ahmet',
        birthDate: '1992-06-15',
        gender: 'GENDER_MALE',
        heightCm: 182,
        weightKg: 78.3,
        steps: { totalSteps: 11450, goalSteps: 8000, distanceKm: 8.4 },
        floors: { floorsClimbed: 12, goalFloors: 10 },
        heartRate: { averageBpm: 76, minBpm: 60, maxBpm: 155, restingBpm: 62 },
        energyScore: 85,
        calories: { totalCalories: 2680, activeCalories: 780, restCalories: 1900 },
        sleep: {
          totalDurationMinutes: 480,
          sleepScore: 82,
          startTime: '23:30',
          endTime: '07:30',
          remMinutes: 95,
          lightSleepMinutes: 285,
          deepSleepMinutes: 90,
          awakeMinutes: 10
        },
        waterIntake: { amountMl: 2250, goalMl: 2000 },
        bodyComposition: { weightKg: 78.3, heightCm: 182, bodyFatPercentage: 16.3, skeletalMuscleMassKg: 36.9, bmi: 23.6 },
        nutrition: { calories: 2450, carbsGrams: 310, proteinGrams: 120, fatGrams: 80, fiberGrams: 28 },
        bloodPressure: [
          { time: '09:00', systolic: 120, diastolic: 80, pulse: 68 },
          { time: '21:00', systolic: 119, diastolic: 77, pulse: 65 }
        ],
        bloodOxygen: [
          { time: '09:05', spo2: 99 },
          { time: '21:05', spo2: 98 }
        ],
        bloodGlucose: [
          { time: '08:15', glucose: 98, mealType: 'FASTING' },
          { time: '14:00', glucose: 125, mealType: 'AFTER_LUNCH' }
        ],
        skinTemperatureAvg: 35.7,
        sleepApneaSeverity: 'NOT_DETECTED',
        workouts: [
          { type: 'Koşu', durationMinutes: 30, caloriesBurned: 350, distanceKm: 5.0 }
        ]
      },
      {
        id: 'sample-3',
        fileName: 'HealthReport_2026_05_24.pdf',
        dateStr: '24 Mayıs 2026',
        date: new Date(2026, 4, 24),
        nickname: 'Ahmet',
        birthDate: '1992-06-15',
        gender: 'GENDER_MALE',
        heightCm: 182,
        weightKg: 78.2,
        steps: { totalSteps: 5400, goalSteps: 8000, distanceKm: 3.8 },
        floors: { floorsClimbed: 3, goalFloors: 10 },
        heartRate: { averageBpm: 68, minBpm: 55, maxBpm: 110, restingBpm: 58 },
        energyScore: 62,
        calories: { totalCalories: 2150, activeCalories: 250, restCalories: 1900 },
        sleep: {
          totalDurationMinutes: 390,
          sleepScore: 64,
          startTime: '01:00',
          endTime: '07:30',
          remMinutes: 60,
          lightSleepMinutes: 240,
          deepSleepMinutes: 60,
          awakeMinutes: 30
        },
        waterIntake: { amountMl: 1200, goalMl: 2000 },
        bodyComposition: { weightKg: 78.2, heightCm: 182, bodyFatPercentage: 16.4, skeletalMuscleMassKg: 36.7, bmi: 23.6 },
        nutrition: { calories: 1950, carbsGrams: 220, proteinGrams: 95, fatGrams: 70, fiberGrams: 16 },
        bloodPressure: [
          { time: '10:00', systolic: 116, diastolic: 74, pulse: 60 },
          { time: '19:30', systolic: 117, diastolic: 75, pulse: 62 }
        ],
        bloodOxygen: [
          { time: '10:05', spo2: 98 }
        ],
        bloodGlucose: [
          { time: '09:00', glucose: 90, mealType: 'FASTING' }
        ],
        skinTemperatureAvg: 35.5,
        sleepApneaSeverity: 'NOT_DETECTED',
        workouts: []
      },
      {
        id: 'sample-4',
        fileName: 'HealthReport_2026_05_25.pdf',
        dateStr: '25 Mayıs 2026',
        date: new Date(2026, 4, 25),
        nickname: 'Ahmet',
        birthDate: '1992-06-15',
        gender: 'GENDER_MALE',
        heightCm: 182,
        weightKg: 78.0,
        steps: { totalSteps: 9800, goalSteps: 8000, distanceKm: 7.1 },
        floors: { floorsClimbed: 8, goalFloors: 10 },
        heartRate: { averageBpm: 74, minBpm: 57, maxBpm: 148, restingBpm: 59 },
        energyScore: 81,
        calories: { totalCalories: 2490, activeCalories: 590, restCalories: 1900 },
        sleep: {
          totalDurationMinutes: 460,
          sleepScore: 80,
          startTime: '23:20',
          endTime: '07:00',
          remMinutes: 90,
          lightSleepMinutes: 270,
          deepSleepMinutes: 90,
          awakeMinutes: 10
        },
        waterIntake: { amountMl: 2100, goalMl: 2000 },
        bodyComposition: { weightKg: 78.0, heightCm: 182, bodyFatPercentage: 16.1, skeletalMuscleMassKg: 37.0, bmi: 23.5 },
        nutrition: { calories: 2300, carbsGrams: 280, proteinGrams: 115, fatGrams: 75, fiberGrams: 25 },
        bloodPressure: [
          { time: '08:45', systolic: 119, diastolic: 76, pulse: 62 },
          { time: '20:30', systolic: 120, diastolic: 78, pulse: 66 }
        ],
        bloodOxygen: [
          { time: '08:50', spo2: 99 },
          { time: '20:35', spo2: 98 }
        ],
        bloodGlucose: [
          { time: '08:00', glucose: 94, mealType: 'FASTING' },
          { time: '13:00', glucose: 118, mealType: 'AFTER_LUNCH' }
        ],
        skinTemperatureAvg: 35.6,
        sleepApneaSeverity: 'NOT_DETECTED',
        workouts: [
          { type: 'Yüzme', durationMinutes: 30, caloriesBurned: 290 }
        ]
      }
    ];

    saveReports(sample);
    setActiveTab('dashboard');
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="app-container">
      {/* Sidebar / Navigation Header */}
      <header className="app-header">
        <div className="header-logo">
          <Activity className="text-teal animate-pulse size-8 mr-3" />
          <h1>S-Health Analizör</h1>
        </div>
        <nav className="header-nav">
          {reports.length > 0 && (
            <button 
              className={`nav-item ${activeTab === 'dashboard' && !selectedReportId ? 'active' : ''}`}
              onClick={() => {
                setSelectedReportId(null);
                setActiveTab('dashboard');
              }}
            >
              <LayoutDashboard className="size-4 mr-2" />
              Sağlık Raporu Panosu
            </button>
          )}
          <button 
            className={`nav-item ${activeTab === 'upload' && !selectedReportId ? 'active' : ''}`}
            onClick={() => {
              setSelectedReportId(null);
              setActiveTab('upload');
            }}
          >
            <PlusCircle className="size-4 mr-2" />
            Yeni Rapor Yükle
          </button>
        </nav>
        <div className="header-actions">
          {reports.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExportData}>
                Yedekle (JSON)
              </button>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                Yedekten Yükle
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={handleImportData} 
                />
              </label>
              <button className="btn btn-danger btn-sm" onClick={handleClearData}>
                Verileri Sıfırla
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                Yedekten Yükle
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={handleImportData} 
                />
              </label>
              <button className="btn btn-secondary btn-sm" onClick={loadSampleData}>
                <Database className="size-4 mr-2" />
                Örnek Raporları Yükle
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {isAnalyzing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="samsung-spinner" style={{
              width: '60px', 
              height: '60px',
              border: '4px solid rgba(11, 211, 160, 0.2)',
              borderTop: '4px solid var(--teal)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-glow)'
            }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Veriler Analiz Ediliyor...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Yapay zeka modelleri sağlık verilerinizi yorumluyor.</p>
          </div>
        ) : selectedReportId && selectedReport ? (
          <ReportDetail 
            report={selectedReport} 
            onBack={() => setSelectedReportId(null)} 
          />
        ) : activeTab === 'dashboard' && reports.length > 0 ? (
          <Dashboard 
            reports={reports} 
            onSelectReport={(id) => setSelectedReportId(id)} 
          />
        ) : (
          <div className="upload-view">
            <div className="welcome-banner card">
              <h2>Samsung Health PDF Raporlarınızı Görselleştirin</h2>
              <p>
                Mobil uygulamamızdan oluşturduğunuz 2 sayfalık sağlık raporu PDF'lerini buraya yükleyerek
                tüm uyku, kat, adım, nabız, tansiyon, şeker ve beslenme değerlerinizin etkileşimli
                grafiklerini ve trendlerini anında görebilirsiniz.
              </p>
              <div className="banner-features">
                <div className="feature">
                  <ShieldAlert className="text-teal size-5 mr-2" />
                  <span><strong>%100 Güvenli & Yerel:</strong> Dosyalarınız hiçbir sunucuya yüklenmez, doğrudan tarayıcınızda yerel olarak işlenir.</span>
                </div>
                <div className="feature">
                  <HeartHandshake className="text-teal size-5 mr-2" />
                  <span><strong>Trend Analizi:</strong> Birden fazla günlük PDF yükleyerek haftalık/aylık gelişim grafiklerinizi çıkarabilirsiniz.</span>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Samsung Health verilerinizi okuyup bu PDF raporlarını üreten mobil uygulamamızı cihazınıza yükleyin:
                </p>
                <a 
                  href={`${import.meta.env.BASE_URL || '/'}shealt-app.apk`} 
                  download="S-Health_Report_Generator.apk"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <Activity className="size-4 mr-2" />
                  Android Uygulamasını İndir (APK)
                </a>
              </div>
            </div>
            
            <FileUploader onReportsParsed={handleReportsParsed} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>© 2026 S-Health Analizör. Kişisel sağlık verileri görselleştirme platformu.</p>
      </footer>
    </div>
  );
};

export default App;
