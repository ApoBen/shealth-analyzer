import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Chart } from 'react-chartjs-2';
import type { HealthReportData } from '../utils/pdfParser';
import { TrendingUp, Activity, Moon, Heart, Flame, Calendar, Info, BarChart2 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  reports: HealthReportData[];
  onSelectReport: (id: string) => void;
}

type TimeFilter = '7days' | '30days' | 'all';
type GroupFilter = 'daily' | 'weekly' | 'monthly';

export const Dashboard: React.FC<DashboardProps> = ({ reports, onSelectReport }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('daily');

  // 1. Sort reports by date ascending
  const sortedReports = [...reports].sort((a, b) => a.date.getTime() - b.date.getTime());

  // 2. Apply Time Filter
  const filterReportsByTime = (data: HealthReportData[]) => {
    if (timeFilter === 'all') return data;
    
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === '7days') cutoff.setDate(now.getDate() - 7);
    if (timeFilter === '30days') cutoff.setDate(now.getDate() - 30);
    
    return data.filter(r => r.date >= cutoff);
  };

  const timeFilteredReports = filterReportsByTime(sortedReports);

  // 3. Apply Group/Aggregation Filter
  // This aggregates data by week or month to avoid crowded charts when data volume is large
  const getAggregatedData = (data: HealthReportData[]) => {
    if (groupFilter === 'daily' || data.length < 5) return data;

    const grouped: Record<string, HealthReportData[]> = {};
    
    data.forEach(r => {
      let key = '';
      if (groupFilter === 'weekly') {
        // Simple week key: Year-WeekNumber
        const firstDayOfYear = new Date(r.date.getFullYear(), 0, 1);
        const pastDaysOfYear = (r.date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${r.date.getFullYear()}-W${weekNum}`;
      } else if (groupFilter === 'monthly') {
        // Month key: Year-Month
        key = `${r.date.getFullYear()}-${r.date.getMonth() + 1}`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    return Object.entries(grouped).map(([key, items]) => {
      // Calculate averages for this week/month group
      const avgSteps = Math.round(items.map(i => i.steps?.totalSteps || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const avgStepsGoal = Math.round(items.map(i => i.steps?.goalSteps || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || 6000;
      const avgDistance = items.map(i => i.steps?.distanceKm || 0).reduce((a, b) => a + b, 0) / items.length || 0;
      const avgFloors = Math.round(items.map(i => i.floors?.floorsClimbed || 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const avgFloorsGoal = Math.round(items.map(i => i.floors?.goalFloors || 0).reduce((a, b) => a + b, 0) / items.length) || 10;
      
      const avgHr = Math.round(items.map(i => i.heartRate?.averageBpm || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const minHr = Math.min(...items.map(i => i.heartRate?.minBpm || 200).filter(v => v < 200)) || 60;
      const maxHr = Math.max(...items.map(i => i.heartRate?.maxBpm || 0)) || 140;
      const restingHr = Math.round(items.map(i => i.heartRate?.restingBpm || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || undefined;
      
      const energy = Math.round(items.map(i => i.energyScore || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const totalCal = items.map(i => i.calories?.totalCalories || 0).reduce((a, b) => a + b, 0) / items.length || 0;
      const activeCal = items.map(i => i.calories?.activeCalories || 0).reduce((a, b) => a + b, 0) / items.length || 0;
      const restCal = items.map(i => i.calories?.restCalories || 0).reduce((a, b) => a + b, 0) / items.length || 0;
      
      const sleepDur = Math.round(items.map(i => i.sleep?.totalDurationMinutes || 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const sleepSc = Math.round(items.map(i => i.sleep?.sleepScore || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / items.length) || undefined;
      const rem = Math.round(items.map(i => i.sleep?.remMinutes || 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const light = Math.round(items.map(i => i.sleep?.lightSleepMinutes || 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const deep = Math.round(items.map(i => i.sleep?.deepSleepMinutes || 0).reduce((a, b) => a + b, 0) / items.length) || 0;
      const awake = Math.round(items.map(i => i.sleep?.awakeMinutes || 0).reduce((a, b) => a + b, 0) / items.length) || 0;

      const water = items.map(i => i.waterIntake?.amountMl || 0).reduce((a, b) => a + b, 0) / items.length || 0;
      const waterGoal = items.map(i => i.waterIntake?.goalMl || 0).reduce((a, b) => a + b, 0) / items.length || 2000;
      
      const nutCal = items.map(i => i.nutrition?.calories || 0).reduce((a, b) => a + b, 0) / items.length || 0;

      // Label naming for group
      let label = key;
      if (groupFilter === 'weekly') {
        const sortedItems = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
        label = `${sortedItems[0].date.getDate()}/${sortedItems[0].date.getMonth()+1} - ${sortedItems[sortedItems.length-1].date.getDate()}/${sortedItems[sortedItems.length-1].date.getMonth()+1}`;
      } else if (groupFilter === 'monthly') {
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const monthIdx = parseInt(key.split('-')[1]) - 1;
        label = `${monthNames[monthIdx]} ${key.split('-')[0]}`;
      }

      return {
        id: key,
        fileName: '',
        dateStr: label,
        date: items[0].date,
        steps: { totalSteps: avgSteps, goalSteps: avgStepsGoal, distanceKm: avgDistance },
        floors: { floorsClimbed: avgFloors, goalFloors: avgFloorsGoal },
        heartRate: { averageBpm: avgHr, minBpm: minHr, maxBpm: maxHr, restingBpm: restingHr },
        energyScore: energy > 0 ? energy : undefined,
        calories: { totalCalories: totalCal, activeCalories: activeCal, restCalories: restCal },
        sleep: {
          totalDurationMinutes: sleepDur,
          sleepScore: sleepSc,
          remMinutes: rem,
          lightSleepMinutes: light,
          deepSleepMinutes: deep,
          awakeMinutes: awake
        },
        waterIntake: { amountMl: water, goalMl: waterGoal },
        nutrition: { calories: nutCal, carbsGrams: 0, proteinGrams: 0, fatGrams: 0 },
        bloodPressure: [],
        bloodOxygen: [],
        bloodGlucose: [],
        workouts: []
      };
    });
  };

  const processedReports = getAggregatedData(timeFilteredReports);
  const labels = processedReports.map(r => r.dateStr);

  // Helper to compute averages safely
  const getAverage = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((sum, val) => sum + val, 0) / arr.length);
  };

  // Summary Metrics based on timeFilter
  const stepCounts = timeFilteredReports.map(r => r.steps?.totalSteps || 0).filter(v => v > 0);
  const avgSteps = getAverage(stepCounts);
  
  const sleepScores = timeFilteredReports.map(r => r.sleep?.sleepScore || 0).filter(v => v > 0);
  const avgSleepScore = getAverage(sleepScores);
  
  const sleepDurations = timeFilteredReports.map(r => r.sleep?.totalDurationMinutes || 0).filter(v => v > 0);
  const avgSleepDuration = getAverage(sleepDurations);
  
  const energyScores = timeFilteredReports.map(r => r.energyScore || 0).filter(v => v > 0);
  const avgEnergy = getAverage(energyScores);
  
  const avgHrs = timeFilteredReports.map(r => r.heartRate?.averageBpm || 0).filter(v => v > 0);
  const avgHeartRate = getAverage(avgHrs);

  // --- ANALYTICAL INSIGHTS & CORRELATIONS ---
  const generateInsights = () => {
    const insights: string[] = [];
    if (timeFilteredReports.length < 3) {
      return ["Analitik çıkarımlar ve korelasyonlar için en az 3 günlük veri yüklenmelidir."];
    }

    // 1. Step Goal Achievement Rate
    const stepsGoals = timeFilteredReports.filter(r => r.steps);
    const achieved = stepsGoals.filter(r => r.steps!.totalSteps >= r.steps!.goalSteps).length;
    const rate = Math.round((achieved / stepsGoals.length) * 100);
    insights.push(`🏃 Adım hedefinize ulaşma oranınız %${rate}. (${stepsGoals.length} günün ${achieved} gününde hedefe ulaşıldı)`);

    // 2. Correlation: Sleep vs Energy Score
    const sleepAndEnergy = timeFilteredReports.filter(r => r.sleep?.totalDurationMinutes && r.energyScore);
    if (sleepAndEnergy.length >= 3) {
      const goodSleep = sleepAndEnergy.filter(r => r.sleep!.totalDurationMinutes >= 420); // 7 hours
      const badSleep = sleepAndEnergy.filter(r => r.sleep!.totalDurationMinutes < 420);
      
      const avgEnergyGoodSleep = getAverage(goodSleep.map(r => r.energyScore!));
      const avgEnergyBadSleep = getAverage(badSleep.map(r => r.energyScore!));
      
      if (goodSleep.length > 0 && badSleep.length > 0 && avgEnergyGoodSleep > avgEnergyBadSleep) {
        insights.push(`🌙 7 saatten fazla uyuduğunuz günlerde ortalama Enerji Skorunuz (${avgEnergyGoodSleep}), az uyuduğunuz günlere göre (${avgEnergyBadSleep}) daha yüksek.`);
      }
    }

    // 3. Correlation: Active steps vs Calories Burned
    const activeCalVsSteps = timeFilteredReports.filter(r => r.steps?.totalSteps && r.calories?.activeCalories);
    if (activeCalVsSteps.length >= 3) {
      const highSteps = activeCalVsSteps.filter(r => r.steps!.totalSteps >= avgSteps);
      const avgCalHighSteps = getAverage(highSteps.map(r => r.calories!.activeCalories));
      insights.push(`🔥 Ortalama adım sayınızın üzerinde yürüdüğünüz günlerde ortalama aktif kalori yakımınız ${avgCalHighSteps.toLocaleString()} kcal.`);
    }

    // 4. Blood Pressure analysis
    const allBp = timeFilteredReports.flatMap(r => r.bloodPressure);
    if (allBp.length > 0) {
      const normalBp = allBp.filter(b => b.systolic < 130 && b.diastolic < 85).length;
      const bpRate = Math.round((normalBp / allBp.length) * 100);
      insights.push(`🩺 Ölçülen tansiyon değerlerinizin %${bpRate} kadarı ideal sınırlarda (130/85 mmHg altı).`);
    }

    return insights;
  };

  const insights = generateInsights();

  // Chart 1: Steps & Goal
  const stepsChartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Adım Sayısı',
        data: processedReports.map(r => r.steps?.totalSteps || 0),
        backgroundColor: 'rgba(79, 172, 254, 0.6)',
        borderColor: 'rgb(79, 172, 254)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        type: 'line' as const,
        label: 'Adım Hedefi',
        data: processedReports.map(r => r.steps?.goalSteps || 6000),
        borderColor: 'rgba(0, 242, 254, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointStyle: 'none',
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  // Chart 2: Sleep Duration & Score
  const sleepChartData = {
    labels,
    datasets: [
      {
        label: 'Uyku Süresi (Saat)',
        data: processedReports.map(r => (r.sleep?.totalDurationMinutes || 0) / 60),
        backgroundColor: 'rgba(127, 0, 255, 0.4)',
        borderColor: 'rgb(127, 0, 255)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Uyku Skoru',
        data: processedReports.map(r => r.sleep?.sleepScore || null),
        borderColor: 'rgb(225, 0, 255)',
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: 'rgb(225, 0, 255)',
        yAxisID: 'y1',
      }
    ]
  };

  const sleepChartOptions = {
    responsive: true,
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Uyku Süresi (Saat)',
          color: '#aaa'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: { color: '#aaa' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Uyku Skoru',
          color: '#aaa'
        },
        ticks: { color: '#aaa' }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: { color: '#aaa' }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#fff' }
      }
    }
  };

  // Chart 3: Heart Rate Ranges
  const hrChartData = {
    labels,
    datasets: [
      {
        label: 'Maks Nabız',
        data: processedReports.map(r => r.heartRate?.maxBpm || null),
        borderColor: 'rgba(255, 8, 68, 0.8)',
        backgroundColor: 'rgba(255, 8, 68, 0.1)',
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Ortalama Nabız',
        data: processedReports.map(r => r.heartRate?.averageBpm || null),
        borderColor: 'rgb(255, 113, 153)',
        backgroundColor: 'rgba(255, 113, 153, 0.2)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Min Nabız',
        data: processedReports.map(r => r.heartRate?.minBpm || null),
        borderColor: 'rgba(255, 177, 153, 0.8)',
        backgroundColor: 'rgba(255, 177, 153, 0.1)',
        borderWidth: 2,
        tension: 0.3,
      }
    ]
  };

  // Chart 4: Calories
  const caloriesChartData = {
    labels,
    datasets: [
      {
        label: 'Yakılan Toplam Enerji (kcal)',
        data: processedReports.map(r => r.calories?.totalCalories || 0),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Besin Enerjisi (Alınan kcal)',
        data: processedReports.map(r => r.nutrition?.calories || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: { color: '#aaa' }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
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
    <div className="dashboard-view">
      {/* Top Filter Bar */}
      <div className="dashboard-filter-bar card">
        <div className="filter-group">
          <Calendar className="text-teal size-5 mr-2" />
          <span className="filter-label">Tarih Aralığı:</span>
          <div className="btn-group">
            <button 
              className={`btn btn-secondary btn-sm ${timeFilter === '7days' ? 'active' : ''}`}
              onClick={() => setTimeFilter('7days')}
            >
              Son 7 Gün
            </button>
            <button 
              className={`btn btn-secondary btn-sm ${timeFilter === '30days' ? 'active' : ''}`}
              onClick={() => setTimeFilter('30days')}
            >
              Son 30 Gün
            </button>
            <button 
              className={`btn btn-secondary btn-sm ${timeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTimeFilter('all')}
            >
              Tüm Zamanlar
            </button>
          </div>
        </div>

        {timeFilteredReports.length >= 5 && (
          <div className="filter-group">
            <BarChart2 className="text-teal size-5 mr-2" />
            <span className="filter-label">Grup Detayı:</span>
            <div className="btn-group">
              <button 
                className={`btn btn-secondary btn-sm ${groupFilter === 'daily' ? 'active' : ''}`}
                onClick={() => setGroupFilter('daily')}
              >
                Günlük Veri
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${groupFilter === 'weekly' ? 'active' : ''}`}
                onClick={() => setGroupFilter('weekly')}
              >
                Haftalık Ort.
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${groupFilter === 'monthly' ? 'active' : ''}`}
                onClick={() => setGroupFilter('monthly')}
              >
                Aylık Ort.
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section-title">
        <TrendingUp className="text-teal size-6" />
        <h2>Sağlık İlerleme Analizi</h2>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="card metric-card steps">
          <div className="metric-header">
            <Activity className="size-6 text-teal" />
            <span>Ort. Günlük Adım</span>
          </div>
          <div className="metric-value">{avgSteps.toLocaleString('tr-TR')}</div>
          <p className="metric-sub">Filtrelenmiş günlük adım ortalaması</p>
        </div>

        <div className="card metric-card sleep">
          <div className="metric-header">
            <Moon className="size-6 text-purple" />
            <span>Ort. Uyku Skoru</span>
          </div>
          <div className="metric-value">
            {avgSleepScore > 0 ? `${avgSleepScore}/100` : `${Math.round(avgSleepDuration / 60)} sa`}
          </div>
          <p className="metric-sub">
            {avgSleepDuration > 0 
              ? `Ort. süre: ${Math.floor(avgSleepDuration / 60)} sa ${avgSleepDuration % 60} dk` 
              : 'Veri yok'}
          </p>
        </div>

        <div className="card metric-card heart">
          <div className="metric-header">
            <Heart className="size-6 text-red" />
            <span>Ortalama Nabız</span>
          </div>
          <div className="metric-value">{avgHeartRate > 0 ? `${avgHeartRate} bpm` : 'Veri yok'}</div>
          <p className="metric-sub">Ortalama gün içi kalp ritmi</p>
        </div>

        <div className="card metric-card energy">
          <div className="metric-header">
            <Flame className="size-6 text-orange" />
            <span>Ort. Enerji Skoru</span>
          </div>
          <div className="metric-value">{avgEnergy > 0 ? `${avgEnergy}/100` : 'Veri yok'}</div>
          <p className="metric-sub">Zindelik ve enerji seviyesi</p>
        </div>
      </div>

      {/* Smart Insights Panel */}
      <div className="card insights-card mb-6">
        <div className="insights-header">
          <Info className="text-teal size-5" />
          <h3>Akıllı Analitik Çıkarımlar & Korelasyonlar</h3>
        </div>
        <ul className="insights-list">
          {insights.map((insight, idx) => (
            <li key={idx}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Fiziksel Aktivite (Adım Trendi)</h3>
          <div className="chart-wrapper">
            <Chart type="bar" data={stepsChartData} options={chartOptions} />
          </div>
        </div>

        <div className="card chart-card">
          <h3>Uyku Durumu & Kalitesi</h3>
          <div className="chart-wrapper">
            <Line data={sleepChartData} options={sleepChartOptions} />
          </div>
        </div>

        <div className="card chart-card">
          <h3>Kalp Ritmi Değişimi (Nabız Aralığı)</h3>
          <div className="chart-wrapper">
            <Line data={hrChartData} options={chartOptions} />
          </div>
        </div>

        <div className="card chart-card">
          <h3>Kalori Dengesi (Yakılan vs Alınan)</h3>
          <div className="chart-wrapper">
            <Line data={caloriesChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Uploaded Reports List Table */}
      <div className="card table-card">
        <h3>Yüklenen Sağlık Raporları</h3>
        <div className="table-responsive">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Adım</th>
                <th>Kat</th>
                <th>Ort. Nabız</th>
                <th>Enerji Skoru</th>
                <th>Uyku Süresi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.dateStr}</strong></td>
                  <td>{r.steps ? `${r.steps.totalSteps.toLocaleString('tr-TR')} adım` : '-'}</td>
                  <td>{r.floors ? `${r.floors.floorsClimbed} kat` : '-'}</td>
                  <td>{r.heartRate ? `${r.heartRate.averageBpm} bpm` : '-'}</td>
                  <td>{r.energyScore ? `${r.energyScore}/100` : '-'}</td>
                  <td>
                    {r.sleep 
                      ? `${Math.floor(r.sleep.totalDurationMinutes / 60)} sa ${r.sleep.totalDurationMinutes % 60} dk` 
                      : '-'}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => onSelectReport(r.id)}>
                      Detayları Gör
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
