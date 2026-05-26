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
  Filler,
  ScatterController
} from 'chart.js';
import { Line, Chart } from 'react-chartjs-2';
import type { HealthReportData } from '../utils/pdfParser';
import { 
  TrendingUp, Activity, Moon, Heart, Flame, Calendar, 
  Info, BarChart2, AlertTriangle, TrendingDown, Award, 
  Sparkles, RefreshCw, BarChart
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ScatterController,
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
type DashboardTab = 'overview' | 'correlations' | 'anomalies';

// Available metrics for Correlation Analysis
interface CorrelationMetric {
  key: string;
  label: string;
  unit: string;
  getValue: (r: HealthReportData) => number | undefined;
}

const CORRELATION_METRICS: CorrelationMetric[] = [
  { key: 'steps', label: 'Günlük Adım Sayısı', unit: 'adım', getValue: (r) => r.steps?.totalSteps },
  { key: 'sleepDuration', label: 'Uyku Süresi', unit: 'saat', getValue: (r) => r.sleep ? r.sleep.totalDurationMinutes / 60 : undefined },
  { key: 'sleepScore', label: 'Uyku Skoru', unit: '/100', getValue: (r) => r.sleep?.sleepScore },
  { key: 'energyScore', label: 'Enerji Skoru', unit: '/100', getValue: (r) => r.energyScore },
  { key: 'avgHr', label: 'Ortalama Nabız', unit: 'bpm', getValue: (r) => r.heartRate?.averageBpm },
  { key: 'restingHr', label: 'Dinlenme Nabzı', unit: 'bpm', getValue: (r) => r.heartRate?.restingBpm },
  { key: 'caloriesBurned', label: 'Yakılan Aktif Kalori', unit: 'kcal', getValue: (r) => r.calories?.activeCalories },
  { key: 'calIntake', label: 'Alınan Besin Enerjisi', unit: 'kcal', getValue: (r) => r.nutrition?.calories },
  { key: 'water', label: 'Su Tüketimi', unit: 'ml', getValue: (r) => r.waterIntake?.amountMl },
  { key: 'weight', label: 'Vücut Ağırlığı', unit: 'kg', getValue: (r) => r.bodyComposition?.weightKg || r.weightKg }
];

export const Dashboard: React.FC<DashboardProps> = ({ reports, onSelectReport }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('daily');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  
  // Correlation State
  const [xMetricKey, setXMetricKey] = useState<string>('steps');
  const [yMetricKey, setYMetricKey] = useState<string>('energyScore');

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

  // 3. Simple Moving Average (SMA) Calculation
  const getMovingAverage = (values: number[], windowSize: number = 7) => {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const windowValues = values.slice(start, i + 1);
      const avg = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      result.push(Math.round(avg * 10) / 10);
    }
    return result;
  };

  // 4. Pearson Correlation Coefficient calculation
  const calculatePearsonCorrelation = (x: number[], y: number[]) => {
    const n = x.length;
    if (n === 0 || n !== y.length) return 0;
    
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
      sumYY += y[i] * y[i];
    }
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    if (den === 0) return 0;
    return num / den;
  };

  // 5. Apply Group/Aggregation Filter for Overview
  const getAggregatedData = (data: HealthReportData[]) => {
    if (groupFilter === 'daily' || data.length < 5) return data;

    const grouped: Record<string, HealthReportData[]> = {};
    
    data.forEach(r => {
      let key = '';
      if (groupFilter === 'weekly') {
        const firstDayOfYear = new Date(r.date.getFullYear(), 0, 1);
        const pastDaysOfYear = (r.date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${r.date.getFullYear()}-W${weekNum}`;
      } else if (groupFilter === 'monthly') {
        key = `${r.date.getFullYear()}-${r.date.getMonth() + 1}`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    return Object.entries(grouped).map(([key, items]) => {
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

  // --- ANALYTICAL INSIGHTS ---
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

  // --- CHARTS CONFIGURATION WITH MOVING AVERAGES ---

  // Chart 1: Steps & Goal & Moving Average
  const stepsChartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Adım Sayısı',
        data: processedReports.map(r => r.steps?.totalSteps || 0),
        backgroundColor: 'rgba(79, 172, 254, 0.5)',
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
      },
      ...(showMovingAverage && groupFilter === 'daily' ? [{
        type: 'line' as const,
        label: '7 Günlük Adım Ortalaması',
        data: getMovingAverage(processedReports.map(r => r.steps?.totalSteps || 0)),
        borderColor: '#ff9f43',
        borderWidth: 2.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      }] : [])
    ]
  };

  // Chart 2: Sleep Duration & Score & Moving Average
  const sleepChartData = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Uyku Süresi (Saat)',
        data: processedReports.map(r => (r.sleep?.totalDurationMinutes || 0) / 60),
        backgroundColor: 'rgba(127, 0, 255, 0.2)',
        borderColor: 'rgb(127, 0, 255)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
      },
      {
        type: 'line' as const,
        label: 'Uyku Skoru',
        data: processedReports.map(r => r.sleep?.sleepScore || null),
        borderColor: 'rgb(225, 0, 255)',
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: 'rgb(225, 0, 255)',
        yAxisID: 'y1',
      },
      ...(showMovingAverage && groupFilter === 'daily' ? [
        {
          type: 'line' as const,
          label: '7 Günlük Uyku Skoru Ort.',
          data: getMovingAverage(processedReports.map(r => r.sleep?.sleepScore || 0).map(v => v === 0 ? avgSleepScore : v)),
          borderColor: '#00b09b',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
        }
      ] : [])
    ]
  };

  // Chart 3: Heart Rate Ranges
  const hrChartData = {
    labels,
    datasets: [
      {
        label: 'Maks Nabız',
        data: processedReports.map(r => r.heartRate?.maxBpm || null),
        borderColor: 'rgba(255, 8, 68, 0.8)',
        backgroundColor: 'rgba(255, 8, 68, 0.05)',
        borderWidth: 1.5,
        tension: 0.3,
      },
      {
        label: 'Ortalama Nabız',
        data: processedReports.map(r => r.heartRate?.averageBpm || null),
        borderColor: 'rgb(255, 113, 153)',
        backgroundColor: 'rgba(255, 113, 153, 0.15)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Min Nabız',
        data: processedReports.map(r => r.heartRate?.minBpm || null),
        borderColor: 'rgba(255, 177, 153, 0.8)',
        backgroundColor: 'rgba(255, 177, 153, 0.05)',
        borderWidth: 1.5,
        tension: 0.3,
      },
      ...(showMovingAverage && groupFilter === 'daily' ? [{
        label: '7 Günlük Ort. Nabız Trendi',
        data: getMovingAverage(processedReports.map(r => r.heartRate?.averageBpm || 0).map(v => v === 0 ? avgHeartRate : v)),
        borderColor: '#00f2fe',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3
      }] : [])
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
        backgroundColor: 'rgba(255, 159, 64, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Besin Enerjisi (Alınan kcal)',
        data: processedReports.map(r => r.nutrition?.calories || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
      ...(showMovingAverage && groupFilter === 'daily' ? [{
        label: '7 Günlük Aktif Kalori Ort.',
        data: getMovingAverage(processedReports.map(r => r.calories?.activeCalories || 0)),
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3
      }] : [])
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
      legend: { labels: { color: '#fff' } }
    }
  };

  const sleepChartOptions = {
    responsive: true,
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Uyku Süresi (Saat)', color: '#aaa' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
        title: { display: true, text: 'Uyku Skoru', color: '#aaa' },
        ticks: { color: '#aaa' }
      },
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      }
    },
    plugins: {
      legend: { labels: { color: '#fff' } }
    }
  };

  // --- CORRELATION TAB CALCULATIONS & PLOT ---
  const xMetric = CORRELATION_METRICS.find(m => m.key === xMetricKey)!;
  const yMetric = CORRELATION_METRICS.find(m => m.key === yMetricKey)!;

  // Extract matched pairs for correlation
  const correlationDataPoints: Array<{x: number, y: number, label: string}> = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  sortedReports.forEach(r => {
    const xVal = xMetric.getValue(r);
    const yVal = yMetric.getValue(r);
    if (xVal !== undefined && xVal !== null && yVal !== undefined && yVal !== null) {
      correlationDataPoints.push({ x: xVal, y: yVal, label: r.dateStr });
      xValues.push(xVal);
      yValues.push(yVal);
    }
  });

  const correlationCoefficient = calculatePearsonCorrelation(xValues, yValues);

  // Interpretation of Pearson r
  const getCorrelationStrengthText = (r: number) => {
    const absR = Math.abs(r);
    let direction = r > 0 ? 'Pozitif' : 'Negatif';
    if (absR < 0.1) return { strength: 'Çok Zayıf / İlişki Yok', color: 'var(--text-muted)', desc: 'İki değişken arasında doğrusal veya anlamlı bir ilişki saptanmamıştır. Diğer etkenler daha baskın olabilir.' };
    if (absR < 0.35) return { strength: `Zayıf ${direction}`, color: '#4facfe', desc: 'Hafif bir ilişki eğilimi var ancak günlük değişkenlikler ve diğer dış etkenler sebebiyle zayıf kalmaktadır.' };
    if (absR < 0.7) return { strength: `Orta Dereceli ${direction}`, color: '#ff9f43', desc: `Belirgin bir ${direction.toLowerCase()} ilişki söz konusudur. Sağlık alışkanlıklarınız bu iki değeri birbirine paralel olarak etkiliyor.` };
    return { strength: `Güçlü ${direction}`, color: '#00b09b', desc: `Çok güçlü ve kararlı bir doğrusal ${direction.toLowerCase()} ilişki saptanmıştır! Biri arttıkça diğeri neredeyse doğrudan ${r > 0 ? 'artmakta' : 'azalmaktadır'}.` };
  };

  const correlationResult = getCorrelationStrengthText(correlationCoefficient);

  const scatterChartData = {
    datasets: [
      {
        label: `${xMetric.label} vs ${yMetric.label}`,
        data: correlationDataPoints,
        backgroundColor: 'rgba(0, 242, 254, 0.75)',
        borderColor: 'rgb(0, 242, 254)',
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const scatterChartOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: { display: true, text: `${xMetric.label} (${xMetric.unit})`, color: '#aaa', font: { size: 12 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      },
      y: {
        type: 'linear' as const,
        title: { display: true, text: `${yMetric.label} (${yMetric.unit})`, color: '#aaa', font: { size: 12 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#aaa' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const pt = context.raw;
            return `Tarih: ${pt.label} | X: ${pt.x.toLocaleString()} | Y: ${pt.y.toLocaleString()}`;
          }
        }
      }
    }
  };

  // --- ANOMALIES & STREAKS CALCULATIONS ---
  const detectAnomalies = () => {
    const anomalies: Array<{ date: string, type: 'warning' | 'danger' | 'info', title: string, text: string }> = [];

    // 1. Blood Pressure Spike
    sortedReports.forEach(r => {
      const highBp = r.bloodPressure.filter(bp => bp.systolic >= 135 || bp.diastolic >= 85);
      if (highBp.length > 0) {
        anomalies.push({
          date: r.dateStr,
          type: 'danger',
          title: 'Yüksek Tansiyon Saptandı',
          text: `Gün içi ölçümde ${highBp.map(bp => `${bp.time}: ${bp.systolic}/${bp.diastolic} mmHg`).join(', ')} tespit edildi. (İdeal Sınır: < 130/80)`
        });
      }
    });

    // 2. High Heart Rate Spike (> 150 bpm)
    sortedReports.forEach(r => {
      if (r.heartRate && r.heartRate.maxBpm > 150) {
        // Exclude exercise days to avoid false alarms
        const hasHeavyExercise = r.workouts.some(w => w.type.toLowerCase().includes('koşu') || w.type.toLowerCase().includes('bisiklet') || w.type.toLowerCase().includes('yüzme'));
        if (!hasHeavyExercise) {
          anomalies.push({
            date: r.dateStr,
            type: 'warning',
            title: 'Yüksek Maksimum Nabız',
            text: `Egzersiz kaydı olmamasına rağmen gün içi maksimum kalp hızı ${r.heartRate.maxBpm} bpm ölçüldü.`
          });
        }
      }
    });

    // 3. Resting Heart Rate Spikes (Spiked by 10bpm above average)
    const restingHrs = sortedReports.map(r => r.heartRate?.restingBpm || 0).filter(v => v > 0);
    const avgRestingHr = getAverage(restingHrs);
    if (avgRestingHr > 0) {
      sortedReports.forEach(r => {
        if (r.heartRate?.restingBpm && r.heartRate.restingBpm >= avgRestingHr + 10) {
          anomalies.push({
            date: r.dateStr,
            type: 'warning',
            title: 'Dinlenme Nabzında Artış',
            text: `Dinlenme nabzınız normal ortalamanızın (${avgRestingHr} bpm) belirgin şekilde üzerine çıkarak ${r.heartRate.restingBpm} bpm ölçülmüştür. (Yorgunluk, hastalık veya uykusuzluk habercisi olabilir)`
          });
        }
      });
    }

    // 4. Critical Sleep Duration (< 5 hours)
    sortedReports.forEach(r => {
      if (r.sleep && r.sleep.totalDurationMinutes < 300 && r.sleep.totalDurationMinutes > 0) {
        anomalies.push({
          date: r.dateStr,
          type: 'danger',
          title: 'Çok Kısa Uyku Süresi',
          text: `Uyku süreniz ${Math.floor(r.sleep.totalDurationMinutes / 60)} saat ${r.sleep.totalDurationMinutes % 60} dk ile ideal sürenin çok altındadır.`
        });
      }
    });

    return anomalies.sort((a,b) => b.date.localeCompare(a.date)); // Sort by date descending
  };

  const anomaliesList = detectAnomalies();

  // Streak counters (consecutive days target hit)
  const calculateStreaks = () => {
    let currentStepStreak = 0;
    let maxStepStreak = 0;
    let currentWaterStreak = 0;
    let maxWaterStreak = 0;

    sortedReports.forEach(r => {
      // Steps streak
      if (r.steps && r.steps.totalSteps >= r.steps.goalSteps) {
        currentStepStreak++;
        if (currentStepStreak > maxStepStreak) maxStepStreak = currentStepStreak;
      } else {
        currentStepStreak = 0;
      }

      // Water streak
      if (r.waterIntake && r.waterIntake.amountMl >= r.waterIntake.goalMl) {
        currentWaterStreak++;
        if (currentWaterStreak > maxWaterStreak) maxWaterStreak = currentWaterStreak;
      } else {
        currentWaterStreak = 0;
      }
    });

    return {
      currentStepStreak,
      maxStepStreak,
      currentWaterStreak,
      maxWaterStreak
    };
  };

  const streaks = calculateStreaks();

  // Weight Progress Calculator
  const getWeightProgress = () => {
    const weightReports = sortedReports.filter(r => r.bodyComposition?.weightKg || r.weightKg);
    if (weightReports.length < 2) return null;

    const first = weightReports[0];
    const last = weightReports[weightReports.length - 1];

    const w1 = first.bodyComposition?.weightKg || first.weightKg!;
    const w2 = last.bodyComposition?.weightKg || last.weightKg!;
    const diff = w2 - w1;
    
    // Body fat progress
    const fatReports = weightReports.filter(r => r.bodyComposition?.bodyFatPercentage);
    let fatDiff = 0;
    if (fatReports.length >= 2) {
      fatDiff = fatReports[fatReports.length - 1].bodyComposition!.bodyFatPercentage! - fatReports[0].bodyComposition!.bodyFatPercentage!;
    }

    return {
      startDate: first.dateStr,
      endDate: last.dateStr,
      startVal: w1,
      endVal: w2,
      diff: parseFloat(diff.toFixed(1)),
      fatDiff: parseFloat(fatDiff.toFixed(1))
    };
  };

  const weightProgress = getWeightProgress();

  return (
    <div className="dashboard-view">
      {/* Sekme Seçim Paneli (Tabs) */}
      <div className="dashboard-tabs card mb-4" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart className="size-4 mr-2" />
          Genel Bakış & Grafikler
        </button>
        <button 
          className={`btn ${activeTab === 'correlations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('correlations')}
        >
          <RefreshCw className="size-4 mr-2 animate-spin-hover" />
          Gelişmiş Korelasyonlar
        </button>
        <button 
          className={`btn ${activeTab === 'anomalies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('anomalies')}
        >
          <AlertTriangle className="size-4 mr-2" />
          Değişimler & Anomaliler
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
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

            {/* Aggregation Filter */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {timeFilteredReports.length >= 5 && (
                <div className="filter-group">
                  <BarChart2 className="text-teal size-5 mr-2" />
                  <span className="filter-label">Grup Detayı:</span>
                  <div className="btn-group">
                    <button 
                      className={`btn btn-secondary btn-sm ${groupFilter === 'daily' ? 'active' : ''}`}
                      onClick={() => { setGroupFilter('daily'); }}
                    >
                      Günlük
                    </button>
                    <button 
                      className={`btn btn-secondary btn-sm ${groupFilter === 'weekly' ? 'active' : ''}`}
                      onClick={() => { setGroupFilter('weekly'); }}
                    >
                      Haftalık Ort.
                    </button>
                    <button 
                      className={`btn btn-secondary btn-sm ${groupFilter === 'monthly' ? 'active' : ''}`}
                      onClick={() => { setGroupFilter('monthly'); }}
                    >
                      Aylık Ort.
                    </button>
                  </div>
                </div>
              )}

              {/* Moving Average Toggle */}
              {groupFilter === 'daily' && timeFilteredReports.length >= 5 && (
                <div className="filter-group" style={{ userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    id="ma-toggle" 
                    checked={showMovingAverage} 
                    onChange={(e) => setShowMovingAverage(e.target.checked)}
                    style={{ marginRight: '0.4rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="ma-toggle" className="filter-label" style={{ cursor: 'pointer' }}>
                    7 Günlük Hareketli Ortalama Göster
                  </label>
                </div>
              )}
            </div>
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
              <p className="metric-sub">Günlük yürünen ortalama adım sayısı</p>
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
                  ? `Ort. Süre: ${Math.floor(avgSleepDuration / 60)} sa ${avgSleepDuration % 60} dk` 
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
        </>
      )}

      {activeTab === 'correlations' && (
        <div className="correlation-tab-view card">
          <div className="section-title">
            <Sparkles className="text-teal size-6 mr-2" />
            <h2>Değişkenler Arası İlişki & Korelasyon Analizi</h2>
          </div>
          <p className="text-muted mb-4">
            Yüklediğiniz veri miktarı arttıkça bu grafikler çok daha doğru sonuçlar verecektir. 
            Sağlık metrikleriniz arasındaki gizli ilişkileri ve biyolojik bağları keşfetmek için iki değişken seçin.
          </p>

          <div className="selectors-row mb-6" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="selector-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
              <label className="filter-label">X Ekseni (Bağımsız Değişken):</label>
              <select 
                value={xMetricKey} 
                onChange={(e) => setXMetricKey(e.target.value)}
                style={{ padding: '0.5rem', background: '#1c192d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              >
                {CORRELATION_METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="selector-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
              <label className="filter-label">Y Ekseni (Bağımlı Değişken):</label>
              <select 
                value={yMetricKey} 
                onChange={(e) => setYMetricKey(e.target.value)}
                style={{ padding: '0.5rem', background: '#1c192d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              >
                {CORRELATION_METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {correlationDataPoints.length < 3 ? (
            <div className="alert error-alert mt-4">
              <Info className="alert-icon size-6" />
              <div>
                <h4>Yetersiz Veri Noktası</h4>
                <p>
                  Korelasyon analizi yapabilmek için seçilen her iki değişkene de sahip en az 3 farklı günün rapor verisi olmalıdır.
                  Mevcut eşleşen gün sayısı: {correlationDataPoints.length}. Lütfen daha fazla rapor yükleyin.
                </p>
              </div>
            </div>
          ) : (
            <div className="correlation-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <h3>Korelasyon Katsayısı (Pearson r)</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', margin: '1rem 0' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, color: correlationResult.color }}>
                    {correlationCoefficient >= 0 ? '+' : ''}{correlationCoefficient.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: correlationResult.color }}>
                    ({correlationResult.strength})
                  </span>
                </div>
                <div className="description-box" style={{ lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <p className="mb-2"><strong>Yorum: </strong>{correlationResult.desc}</p>
                  <p style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${correlationResult.color}` }}>
                    {xMetricKey === 'steps' && yMetricKey === 'energyScore' && (
                      "Elde edilen veri, günlük hareket miktarınız arttıkça vücudunuzun biyolojik olarak daha zinde hissettiğini ve hücresel enerji düzeyinizin (S-Health Enerji Skoru) yükseldiğini göstermektedir."
                    )}
                    {xMetricKey === 'sleepDuration' && yMetricKey === 'energyScore' && (
                      "Uyku süresinin yeterli olduğu günlerde ertesi günkü zindelik puanı genellikle yükselir. Vücudun tam toparlanması (Recovery) için en az 7 saatlik uyku hedeflenmelidir."
                    )}
                    {xMetricKey === 'steps' && yMetricKey === 'caloriesBurned' && (
                      "Adım sayınız arttıkça yaktığınız aktif enerjinin doğrudan artması biyomekanik olarak beklenen bir durumdur. Bu doğrusal korelasyon verilerinizle de kanıtlanmaktadır."
                    )}
                    {xMetricKey === 'restingHr' && yMetricKey === 'sleepScore' && (
                      "Yüksek dinlenme nabzı (RHR) genellikle stres, aşırı antrenman (overtraining) veya uykusuzluk göstergesidir. RHR düştükçe uyku puanınızın yükseldiğini gözlemleyebilirsiniz."
                    )}
                    {!( (xMetricKey === 'steps' && yMetricKey === 'energyScore') || (xMetricKey === 'sleepDuration' && yMetricKey === 'energyScore') || (xMetricKey === 'steps' && yMetricKey === 'caloriesBurned') || (xMetricKey === 'restingHr' && yMetricKey === 'sleepScore') ) && (
                      `Seçilen iki parametre (${xMetric.label} ve ${yMetric.label}) arasındaki doğrusal bağ gücü istatistiksel olarak hesaplanmıştır. Veri hacmi arttıkça korelasyon netleşecek ve kişisel yaşam alışkanlıklarınıza özel geri bildirimler üretecektir.`
                    )}
                  </p>
                </div>
              </div>

              <div className="card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <h3>İlişki Serpme Grafiği</h3>
                <div className="chart-wrapper" style={{ height: '300px', marginTop: '1rem' }}>
                  <Chart type="scatter" data={scatterChartData} options={scatterChartOptions} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="anomalies-tab-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Weight & Body Comp Changes */}
          {weightProgress && (
            <div className="card" style={{ borderLeft: '4px solid #00b09b' }}>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <Award className="text-green size-6 mr-2" />
                <h3>Vücut Kompozisyonu ve Kilo Gelişimi</h3>
              </div>
              <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
                {weightProgress.startDate} ile {weightProgress.endDate} tarihleri arasındaki gelişim durumunuz.
              </p>
              <div className="metrics-grid">
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                  <span className="sub-label">Başlangıç Ağırlığı</span>
                  <div className="metric-value" style={{ fontSize: '1.8rem' }}>{weightProgress.startVal} kg</div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                  <span className="sub-label">Güncel Ağırlık</span>
                  <div className="metric-value" style={{ fontSize: '1.8rem' }}>{weightProgress.endVal} kg</div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                  <span className="sub-label">Net Ağırlık Değişimi</span>
                  <div className="metric-value" style={{ fontSize: '1.8rem', color: weightProgress.diff <= 0 ? '#10b981' : '#ff0844' }}>
                    {weightProgress.diff > 0 ? '+' : ''}{weightProgress.diff} kg
                  </div>
                  <p className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {weightProgress.diff <= 0 ? <TrendingDown className="size-4 text-green" /> : <TrendingUp className="size-4 text-red" />}
                    Kilo kaybı/alımı farkı
                  </p>
                </div>
                {weightProgress.fatDiff !== 0 && (
                  <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                    <span className="sub-label">Yağ Oranı Değişimi</span>
                    <div className="metric-value" style={{ fontSize: '1.8rem', color: weightProgress.fatDiff <= 0 ? '#10b981' : '#ff0844' }}>
                      {weightProgress.fatDiff > 0 ? '+' : ''}{weightProgress.fatDiff} %
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Streaks & Records */}
          <div className="card">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Award className="text-orange size-6 mr-2" />
              <h3>Kişisel Başarılar & Hedef Serileri</h3>
            </div>
            <div className="metrics-grid">
              <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                <span className="sub-label">Aktif Adım Serisi</span>
                <div className="metric-value" style={{ fontSize: '1.8rem', color: '#ff9f43' }}>{streaks.currentStepStreak} Gün</div>
                <p className="metric-sub">Adım hedefine üst üste ulaşılan aktif gün</p>
                <div className="metric-sub" style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                  Rekor Seri: {streaks.maxStepStreak} gün
                </div>
              </div>

              <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                <span className="sub-label">Aktif Su Serisi</span>
                <div className="metric-value" style={{ fontSize: '1.8rem', color: '#3b82f6' }}>{streaks.currentWaterStreak} Gün</div>
                <p className="metric-sub">Su hedefine üst üste ulaşılan aktif gün</p>
                <div className="metric-sub" style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                  Rekor Seri: {streaks.maxWaterStreak} gün
                </div>
              </div>
            </div>
          </div>

          {/* Anomalies List */}
          <div className="card">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <AlertTriangle className="text-red size-6 mr-2" />
              <h3>Sıra Dışı Bulgular & Fizyolojik Anomaliler</h3>
            </div>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Raporlarınızdaki ölçümlerde saptanan ve normal sınırların dışına çıkan fizyolojik bulguların geçmişi (Tansiyon, Nabız, Uyku vb.).
            </p>

            {anomaliesList.length === 0 ? (
              <div className="alert success-alert">
                <Award className="alert-icon size-6" />
                <div>
                  <h4>Tebrikler, Tüm Bulgular Normal!</h4>
                  <p>Yüklenen raporlarınızda tansiyon yükselmesi, aşırı uykusuzluk veya anormal nabız anomalisi tespit edilmemiştir.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {anomaliesList.map((anom, idx) => (
                  <div 
                    key={idx} 
                    className="anomaly-item" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '1rem', 
                      borderRadius: '10px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderLeft: `4px solid ${anom.type === 'danger' ? '#ef4444' : '#ff9f43'}`
                    }}
                  >
                    {anom.type === 'danger' ? (
                      <AlertTriangle className="text-red size-6" style={{ flexShrink: 0 }} />
                    ) : (
                      <Info className="text-orange size-6" style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{anom.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{anom.date}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{anom.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
