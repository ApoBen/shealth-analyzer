import React from 'react';
import type { HealthReportData } from '../utils/pdfParser';
import { Doughnut, Line } from 'react-chartjs-2';
import { 
  ArrowLeft, Calendar, User, Activity, Moon, Heart, 
  Flame, Droplets, Scale, Apple, ChevronRight, CheckCircle2 
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

interface ReportDetailProps {
  report: HealthReportData;
  onBack: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({ report, onBack }) => {
  // Chart 1: Sleep Stages Doughnut
  const hasSleepStages = report.sleep && (report.sleep.remMinutes > 0 || report.sleep.lightSleepMinutes > 0 || report.sleep.deepSleepMinutes > 0 || report.sleep.awakeMinutes > 0);
  
  const sleepStagesData = {
    labels: ['REM Uyku', 'Hafif Uyku', 'Derin Uyku', 'Uyanık'],
    datasets: [
      {
        data: hasSleepStages ? [
          report.sleep!.remMinutes,
          report.sleep!.lightSleepMinutes,
          report.sleep!.deepSleepMinutes,
          report.sleep!.awakeMinutes
        ] : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(225, 0, 255, 0.7)',
          'rgba(127, 0, 255, 0.7)',
          'rgba(3, 102, 214, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ],
        borderColor: [
          'rgb(225, 0, 255)',
          'rgb(127, 0, 255)',
          'rgb(3, 102, 214)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1,
      }
    ]
  };

  // Chart 2: Macronutrients Breakdown Doughnut
  const hasNutrition = report.nutrition && (report.nutrition.carbsGrams > 0 || report.nutrition.proteinGrams > 0 || report.nutrition.fatGrams > 0);
  
  const macroData = {
    labels: ['Karbonhidrat (g)', 'Protein (g)', 'Yağ (g)'],
    datasets: [
      {
        data: hasNutrition ? [
          report.nutrition!.carbsGrams,
          report.nutrition!.proteinGrams,
          report.nutrition!.fatGrams
        ] : [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)'
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
          'rgb(255, 206, 86)'
        ],
        borderWidth: 1,
      }
    ]
  };

  // Chart 3: Blood Pressure Over the Day
  const sortedBp = [...report.bloodPressure].sort((a, b) => a.time.localeCompare(b.time));
  const bpChartData = {
    labels: sortedBp.map(b => b.time),
    datasets: [
      {
        label: 'Sistolik (Büyük)',
        data: sortedBp.map(b => b.systolic),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        tension: 0.2,
        fill: true
      },
      {
        label: 'Diastolik (Küçük)',
        data: sortedBp.map(b => b.diastolic),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 2,
        tension: 0.2,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      },
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#fff' }
      }
    }
  };

  return (
    <div className="report-detail-view">
      <button className="btn btn-secondary back-btn" onClick={onBack}>
        <ArrowLeft className="size-4 mr-2" />
        Panoya Geri Dön
      </button>

      {/* Header */}
      <div className="detail-header card">
        <div className="header-main">
          <Calendar className="text-teal size-8 mr-4" />
          <div>
            <h2>{report.dateStr} Raporu Detayları</h2>
            <p className="text-muted">Dosya: {report.fileName}</p>
          </div>
        </div>
        
        {(report.nickname || report.gender || report.heightCm || report.weightKg) && (
          <div className="profile-summary">
            <User className="size-4 mr-2 text-teal" />
            <span>
              {report.nickname || 'Kullanıcı'} | {report.gender === 'GENDER_MALE' ? 'Erkek' : 'Kadın'}
              {report.heightCm ? ` | Boy: ${report.heightCm} cm` : ''}
              {report.weightKg ? ` | Kilo: ${report.weightKg} kg` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="detail-grid">
        
        {/* Steps & Floors Card */}
        {report.steps && (
          <div className="card stat-section">
            <div className="section-header">
              <Activity className="text-teal size-5" />
              <h3>Aktivite & Hareket</h3>
            </div>
            <div className="large-stat">
              <span className="value">{report.steps.totalSteps.toLocaleString('tr-TR')}</span>
              <span className="label"> / {report.steps.goalSteps.toLocaleString('tr-TR')} Adım</span>
            </div>
            
            <div className="sub-stats-grid">
              <div className="sub-stat">
                <span className="sub-label">Yürünen Mesafe</span>
                <span className="sub-value">{(report.steps.distanceKm).toFixed(2)} km</span>
              </div>
              {report.floors && (
                <div className="sub-stat">
                  <span className="sub-label">Çıkılan Kat</span>
                  <span className="sub-value">{report.floors.floorsClimbed} / {report.floors.goalFloors} kat</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sleep Card */}
        {report.sleep && (
          <div className="card stat-section">
            <div className="section-header">
              <Moon className="text-purple size-5" />
              <h3>Uyku Kalitesi</h3>
            </div>
            <div className="large-stat">
              <span className="value">
                {Math.floor(report.sleep.totalDurationMinutes / 60)} sa {report.sleep.totalDurationMinutes % 60} dk
              </span>
              {report.sleep.sleepScore && (
                <span className="label"> (Skor: {report.sleep.sleepScore}/100)</span>
              )}
            </div>
            <div className="sub-stats-grid">
              <div className="sub-stat">
                <span className="sub-label">Yatma - Uyanma</span>
                <span className="sub-value">
                  {report.sleep.startTime || '--:--'} - {report.sleep.endTime || '--:--'}
                </span>
              </div>
              <div className="sub-stat">
                <span className="sub-label">REM / Derin Uyku</span>
                <span className="sub-value">
                  {report.sleep.remMinutes} dk / {report.sleep.deepSleepMinutes} dk
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Heart Rate Card */}
        {report.heartRate && (
          <div className="card stat-section">
            <div className="section-header">
              <Heart className="text-red size-5" />
              <h3>Kalp Hızı Özet</h3>
            </div>
            <div className="large-stat">
              <span className="value">{report.heartRate.averageBpm}</span>
              <span className="label"> bpm (Ortalama)</span>
            </div>
            <div className="sub-stats-grid">
              <div className="sub-stat">
                <span className="sub-label">Min - Maks Nabız</span>
                <span className="sub-value">{report.heartRate.minBpm} - {report.heartRate.maxBpm} bpm</span>
              </div>
              {report.heartRate.restingBpm && (
                <div className="sub-stat">
                  <span className="sub-label">Dinlenme Nabzı</span>
                  <span className="sub-value">{report.heartRate.restingBpm} bpm</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Energy & Calories Card */}
        {(report.energyScore !== undefined || report.calories) && (
          <div className="card stat-section">
            <div className="section-header">
              <Flame className="text-orange size-5" />
              <h3>Enerji & Kalori</h3>
            </div>
            <div className="large-stat">
              {report.energyScore !== undefined ? (
                <>
                  <span className="value">{report.energyScore}</span>
                  <span className="label"> / 100 (Enerji)</span>
                </>
              ) : (
                <>
                  <span className="value">{report.calories?.totalCalories.toFixed(0)}</span>
                  <span className="label"> kcal</span>
                </>
              )}
            </div>
            <div className="sub-stats-grid">
              {report.calories && (
                <>
                  <div className="sub-stat">
                    <span className="sub-label">Aktif Kalori</span>
                    <span className="sub-value">{report.calories.activeCalories.toFixed(0)} kcal</span>
                  </div>
                  <div className="sub-stat">
                    <span className="sub-label">Dinlenme Kalorisi</span>
                    <span className="sub-value">{report.calories.restCalories.toFixed(0)} kcal</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Doughnut Charts & Body Comp Grid */}
      <div className="details-secondary-grid">
        {/* Sleep Stages Chart */}
        {hasSleepStages && (
          <div className="card detail-chart-card">
            <h3>Uyku Evreleri Dağılımı</h3>
            <div className="doughnut-wrapper">
              <Doughnut data={sleepStagesData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }} />
            </div>
          </div>
        )}

        {/* Nutrition Chart */}
        {hasNutrition && (
          <div className="card detail-chart-card">
            <h3>Günlük Tüketim & Makrolar</h3>
            <div className="nutrition-summary-top">
              <Apple className="text-green size-6 inline-block mr-2" />
              <strong>{report.nutrition!.calories.toFixed(0)} kcal</strong>
            </div>
            <div className="doughnut-wrapper">
              <Doughnut data={macroData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }} />
            </div>
            {report.nutrition!.fiberGrams !== undefined && (
              <p className="fiber-text">Diyet Lifi: {report.nutrition!.fiberGrams.toFixed(1)}g</p>
            )}
          </div>
        )}

        {/* Body Composition Card */}
        {report.bodyComposition && (
          <div className="card details-list-card">
            <div className="card-header-icon">
              <Scale className="text-teal size-6" />
              <h3>Vücut Analizi</h3>
            </div>
            <ul className="details-list">
              <li>
                <span>Ağırlık</span>
                <strong>{report.bodyComposition.weightKg} kg</strong>
              </li>
              {report.bodyComposition.heightCm && (
                <li>
                  <span>Boy</span>
                  <strong>{report.bodyComposition.heightCm} cm</strong>
                </li>
              )}
              {report.bodyComposition.bodyFatPercentage && (
                <li>
                  <span>Vücut Yağ Oranı</span>
                  <strong>% {report.bodyComposition.bodyFatPercentage}</strong>
                </li>
              )}
              {report.bodyComposition.skeletalMuscleMassKg && (
                <li>
                  <span>İskelet Kası</span>
                  <strong>{report.bodyComposition.skeletalMuscleMassKg} kg</strong>
                </li>
              )}
              {report.bodyComposition.bmi && (
                <li>
                  <span>Vücut Kitle Endeksi (BMI)</span>
                  <strong className="bmi-badge">{report.bodyComposition.bmi}</strong>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Blood Pressure and Medical Charts */}
      {report.bloodPressure.length > 0 && (
        <div className="card chart-large-card">
          <h3>Gün İçi Tansiyon Takibi</h3>
          <div className="chart-large-wrapper">
            <Line data={bpChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Medical Measurements lists */}
      {(report.bloodGlucose.length > 0 || report.bloodOxygen.length > 0 || report.waterIntake || report.skinTemperatureAvg || report.sleepApneaSeverity) && (
        <div className="card medical-data-card">
          <h3>Ölçümler ve Diğer Bulgular</h3>
          <div className="medical-items-grid">
            {/* Water */}
            {report.waterIntake && (
              <div className="medical-item">
                <div className="item-header">
                  <Droplets className="text-blue size-5 mr-2" />
                  <h4>Su Tüketimi</h4>
                </div>
                <div className="item-body">
                  <div className="item-val">{report.waterIntake.amountMl} / {report.waterIntake.goalMl} ml</div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${Math.min(100, (report.waterIntake.amountMl / report.waterIntake.goalMl) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Blood Glucose */}
            {report.bloodGlucose.length > 0 && (
              <div className="medical-item">
                <div className="item-header">
                  <Activity className="text-red size-5 mr-2" />
                  <h4>Kan Şekeri</h4>
                </div>
                <div className="item-body">
                  <ul className="sub-list">
                    {report.bloodGlucose.map((g, idx) => (
                      <li key={idx}>
                        <span>{g.time}</span>
                        <strong>{g.glucose} mg/dL {g.mealType ? `(${g.mealType})` : ''}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Blood Oxygen */}
            {report.bloodOxygen.length > 0 && (
              <div className="medical-item">
                <div className="item-header">
                  <Heart className="text-teal size-5 mr-2" />
                  <h4>Kandaki Oksijen (SpO2)</h4>
                </div>
                <div className="item-body">
                  <ul className="sub-list">
                    {report.bloodOxygen.map((o, idx) => (
                      <li key={idx}>
                        <span>{o.time}</span>
                        <strong>% {o.spo2}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Temp & Apnea */}
            {(report.skinTemperatureAvg || report.sleepApneaSeverity) && (
              <div className="medical-item">
                <div className="item-header">
                  <CheckCircle2 className="text-green size-5 mr-2" />
                  <h4>Fizyolojik Analiz</h4>
                </div>
                <div className="item-body">
                  <ul className="sub-list">
                    {report.skinTemperatureAvg && (
                      <li>
                        <span>Cilt Sıcaklığı (Ort.)</span>
                        <strong>{report.skinTemperatureAvg.toFixed(1)} °C</strong>
                      </li>
                    )}
                    {report.sleepApneaSeverity && (
                      <li>
                        <span>Uyku Apnesi Riski</span>
                        <strong className={report.sleepApneaSeverity === 'DETECTED' ? 'text-red' : 'text-green'}>
                          {report.sleepApneaSeverity === 'DETECTED' ? 'Risk Tespit Edildi' : 'Risk Saptanmadı'}
                        </strong>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workouts list card */}
      {report.workouts.length > 0 && (
        <div className="card table-card mt-6">
          <h3>Egzersiz Seansları</h3>
          <div className="table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Egzersiz Türü</th>
                  <th>Süre</th>
                  <th>Yakılan Enerji</th>
                  <th>Mesafe (km)</th>
                </tr>
              </thead>
              <tbody>
                {report.workouts.map((w, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="flex items-center">
                        <ChevronRight className="size-4 text-teal mr-2" />
                        <strong>{w.type}</strong>
                      </div>
                    </td>
                    <td>{w.durationMinutes} dk</td>
                    <td>{w.caloriesBurned.toFixed(1)} kcal</td>
                    <td>{w.distanceKm ? `${w.distanceKm.toFixed(2)} km` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
