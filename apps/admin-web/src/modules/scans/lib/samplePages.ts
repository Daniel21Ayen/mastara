// apps/admin-web/src/modules/scans/lib/samplePages.ts

export interface ScanPageItem {
  id: string;
  name: string;
  sizeBytes: number;
  url: string;
  rotation: number;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const SAMPLE_PAGES: readonly ScanPageItem[] = [
  {
    id: 'sample-p1',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p1.png',
    sizeBytes: 245_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0b172a">
        <rect width="600" height="420" fill="#0b172a"/>
        <!-- Header -->
        <rect x="0" y="0" width="600" height="45" fill="#0f1f38"/>
        <text x="24" y="28" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Resolving System Dashboard</text>
        <circle cx="560" cy="22" r="12" fill="#3b82f6"/>
        
        <!-- Cards Grid -->
        <g transform="translate(24, 60)">
          <!-- Left Column Card: Recent Customers -->
          <rect x="0" y="0" width="260" height="160" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#93c5fd">Recent Customers</text>
          <text x="210" y="28" font-family="system-ui, sans-serif" font-size="10" fill="#60a5fa">View All</text>
          
          <rect x="16" y="44" width="228" height="28" rx="4" fill="#1e293b"/>
          <circle cx="30" cy="58" r="7" fill="#3b82f6"/>
          <text x="44" y="62" font-family="system-ui, sans-serif" font-size="10" fill="#e2e8f0">John Smith · Toyota Corolla</text>
          
          <rect x="16" y="78" width="228" height="28" rx="4" fill="#1e293b"/>
          <circle cx="30" cy="92" r="7" fill="#10b981"/>
          <text x="44" y="96" font-family="system-ui, sans-serif" font-size="10" fill="#e2e8f0">Sarah Johnson · Honda Civic</text>
          
          <rect x="16" y="112" width="228" height="28" rx="4" fill="#1e293b"/>
          <circle cx="30" cy="126" r="7" fill="#f59e0b"/>
          <text x="44" y="130" font-family="system-ui, sans-serif" font-size="10" fill="#e2e8f0">David Wilson · BMW 3-Series</text>

          <!-- Middle Card: Order Tracking -->
          <rect x="275" y="0" width="275" height="160" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
          <text x="290" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#93c5fd">Order Tracking</text>
          <rect x="290" y="45" width="160" height="30" rx="4" fill="#0f172a" stroke="#334155"/>
          <text x="300" y="64" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">Enter order hash</text>
          <rect x="460" y="45" width="75" height="30" rx="4" fill="#2563eb"/>
          <text x="473" y="64" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#ffffff">Track Order</text>
          
          <rect x="290" y="90" width="245" height="55" rx="6" fill="#1e293b"/>
          <path d="M305 118 L330 100 L355 110 L380 95 L405 105 L430 90 L455 102 L480 88 L510 95" stroke="#38bdf8" stroke-width="2" fill="none"/>
        </g>
        
        <!-- Bottom Section: Garage Performance -->
        <g transform="translate(24, 235)">
          <rect x="0" y="0" width="550" height="160" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#93c5fd">Garage Performance Overview</text>
          <text x="470" y="28" font-family="system-ui, sans-serif" font-size="10" fill="#60a5fa">April 2026</text>
          
          <rect x="16" y="45" width="120" height="50" rx="6" fill="#1e293b"/>
          <text x="28" y="68" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#38bdf8">124</text>
          <text x="28" y="85" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Total Orders</text>
          
          <rect x="150" y="45" width="120" height="50" rx="6" fill="#1e293b"/>
          <text x="162" y="68" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#34d399">92</text>
          <text x="162" y="85" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Completed Orders</text>

          <rect x="284" y="45" width="120" height="50" rx="6" fill="#1e293b"/>
          <text x="296" y="68" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#fbbf24">2.3 Hrs</text>
          <text x="296" y="85" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Avg Service Time</text>

          <rect x="418" y="45" width="115" height="50" rx="6" fill="#1e293b"/>
          <text x="430" y="68" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#a78bfa">4.8 / 5</text>
          <text x="430" y="85" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Customer Rating</text>

          <path d="M25 140 C 120 110, 240 145, 360 115 S 480 135, 525 105" stroke="#3b82f6" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p2',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p2.png',
    sizeBytes: 230_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0f172a">
        <rect width="600" height="420" fill="#0f172a"/>
        <!-- Global Bank Navbar -->
        <rect x="0" y="0" width="600" height="48" fill="#1e293b"/>
        <path d="M24 16h16v16H24z" fill="#3b82f6"/>
        <text x="48" y="28" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Global Bank</text>
        <text x="48" y="39" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8">Transaction Settlement System</text>
        
        <text x="520" y="28" font-family="system-ui, sans-serif" font-size="10" fill="#cbd5e1">Apr 21, 2026</text>
        
        <!-- Welcome Hero Banner -->
        <g transform="translate(24, 60)">
          <rect x="0" y="0" width="550" height="65" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="20" y="30" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Welcome back, Administrator</text>
          <text x="20" y="48" font-family="system-ui, sans-serif" font-size="11" fill="#94a3b8">Here is what is happening with your banking network today.</text>
          <rect x="420" y="16" width="115" height="32" rx="6" fill="#2563eb"/>
          <text x="477" y="36" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">Network Status</text>
        </g>
        
        <!-- 4 KPI Cards -->
        <g transform="translate(24, 140)">
          <!-- KPI 1 -->
          <rect x="0" y="0" width="128" height="70" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="14" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Total Balance</text>
          <text x="14" y="48" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">$12,458,732</text>
          <text x="14" y="62" font-family="system-ui, sans-serif" font-size="8" fill="#10b981">▲ 2.4% vs yesterday</text>
          
          <!-- KPI 2 -->
          <rect x="140" y="0" width="128" height="70" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="154" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Today Transactions</text>
          <text x="154" y="48" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">248</text>
          <text x="154" y="62" font-family="system-ui, sans-serif" font-size="8" fill="#10b981">▲ 12.7% volume</text>

          <!-- KPI 3 -->
          <rect x="280" y="0" width="128" height="70" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="294" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Active Customers</text>
          <text x="294" y="48" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">1,204</text>
          <text x="294" y="62" font-family="system-ui, sans-serif" font-size="8" fill="#10b981">▲ 5.1% active</text>

          <!-- KPI 4 -->
          <rect x="420" y="0" width="130" height="70" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="434" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">System Health</text>
          <text x="434" y="48" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#10b981">Healthy</text>
          <text x="434" y="62" font-family="system-ui, sans-serif" font-size="8" fill="#94a3b8">All nodes sync 99.9%</text>
        </g>
        
        <!-- Transaction Volume Graph -->
        <g transform="translate(24, 225)">
          <rect x="0" y="0" width="550" height="175" rx="8" fill="#1e293b" stroke="#334155"/>
          <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#ffffff">Transaction Volume & Settlement Flows</text>
          <path d="M20 140 C 80 80, 160 120, 240 70 S 380 130, 460 60 L 530 85" stroke="#38bdf8" stroke-width="3" fill="none"/>
          <path d="M20 155 C 80 110, 160 140, 240 100 S 380 150, 460 90 L 530 115" stroke="#6366f1" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
          <line x1="20" y1="160" x2="530" y2="160" stroke="#334155" stroke-width="1"/>
          <text x="20" y="172" font-family="system-ui, sans-serif" font-size="8" fill="#64748b">00:00</text>
          <text x="150" y="172" font-family="system-ui, sans-serif" font-size="8" fill="#64748b">06:00</text>
          <text x="280" y="172" font-family="system-ui, sans-serif" font-size="8" fill="#64748b">12:00</text>
          <text x="410" y="172" font-family="system-ui, sans-serif" font-size="8" fill="#64748b">18:00</text>
          <text x="510" y="172" font-family="system-ui, sans-serif" font-size="8" fill="#64748b">24:00</text>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p3',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p3.png',
    sizeBytes: 215_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0b172a">
        <rect width="600" height="420" fill="#0b172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
        <text x="45" y="60" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Multi-Currency Liquidity & Reserves</text>
        <g transform="translate(45, 90)">
          <!-- USD -->
          <rect x="0" y="0" width="240" height="50" rx="6" fill="#1e293b"/>
          <text x="16" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff">USD / United States Dollar</text>
          <text x="16" y="40" font-family="system-ui, sans-serif" font-size="10" fill="#38bdf8">$5,820,110.00</text>
          <!-- EUR -->
          <rect x="260" y="0" width="240" height="50" rx="6" fill="#1e293b"/>
          <text x="276" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff">EUR / Euro Reserve</text>
          <text x="276" y="40" font-family="system-ui, sans-serif" font-size="10" fill="#34d399">€4,120,450.00</text>
          <!-- ETB -->
          <rect x="0" y="65" width="240" height="50" rx="6" fill="#1e293b"/>
          <text x="16" y="89" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff">ETB / Ethiopian Birr</text>
          <text x="16" y="105" font-family="system-ui, sans-serif" font-size="10" fill="#fbbf24">Br 128,400,000.00</text>
          <!-- GBP -->
          <rect x="260" y="65" width="240" height="50" rx="6" fill="#1e293b"/>
          <text x="276" y="89" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff">GBP / British Pound</text>
          <text x="276" y="105" font-family="system-ui, sans-serif" font-size="10" fill="#a78bfa">£2,100,200.00</text>
        </g>
        <!-- Bar Chart -->
        <g transform="translate(45, 235)">
          <text x="0" y="15" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#93c5fd">Quarterly Settlement Performance</text>
          <rect x="0" y="35" width="500" height="90" rx="6" fill="#1e293b"/>
          <rect x="40" y="70" width="30" height="45" fill="#3b82f6" rx="3"/>
          <rect x="120" y="55" width="30" height="60" fill="#3b82f6" rx="3"/>
          <rect x="200" y="45" width="30" height="70" fill="#3b82f6" rx="3"/>
          <rect x="280" y="60" width="30" height="55" fill="#3b82f6" rx="3"/>
          <rect x="360" y="40" width="30" height="75" fill="#10b981" rx="3"/>
          <rect x="440" y="35" width="30" height="80" fill="#10b981" rx="3"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p4',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p4.png',
    sizeBytes: 250_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0f172a">
        <rect width="600" height="420" fill="#0f172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <text x="45" y="55" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Mobile App Wireframe & Flow</text>
        
        <!-- 3 Mobile Device Frames -->
        <g transform="translate(60, 80)">
          <!-- Phone 1 -->
          <rect x="0" y="0" width="120" height="230" rx="14" fill="#020617" stroke="#475569" stroke-width="3"/>
          <rect x="10" y="15" width="100" height="200" rx="8" fill="#1e293b"/>
          <rect x="20" y="30" width="80" height="12" rx="3" fill="#3b82f6"/>
          <rect x="20" y="50" width="80" height="40" rx="4" fill="#334155"/>
          <rect x="20" y="100" width="80" height="80" rx="4" fill="#0f172a"/>
          
          <!-- Phone 2 -->
          <rect x="160" y="0" width="120" height="230" rx="14" fill="#020617" stroke="#3b82f6" stroke-width="3"/>
          <rect x="170" y="15" width="100" height="200" rx="8" fill="#1e293b"/>
          <rect x="180" y="30" width="80" height="24" rx="4" fill="#2563eb"/>
          <rect x="180" y="65" width="80" height="60" rx="4" fill="#334155"/>
          <circle cx="220" cy="160" r="18" fill="#10b981"/>

          <!-- Phone 3 -->
          <rect x="320" y="0" width="120" height="230" rx="14" fill="#020617" stroke="#475569" stroke-width="3"/>
          <rect x="330" y="15" width="100" height="200" rx="8" fill="#1e293b"/>
          <rect x="340" y="30" width="80" height="15" rx="3" fill="#64748b"/>
          <rect x="340" y="55" width="80" height="70" rx="4" fill="#334155"/>
          <rect x="340" y="135" width="80" height="24" rx="4" fill="#f59e0b"/>
        </g>
        <text x="300" y="350" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#93c5fd" text-anchor="middle">Mobile Learning Architecture · Cross-Platform Android & iOS</text>
      </svg>
    `),
  },
  {
    id: 'sample-p5',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p5.png',
    sizeBytes: 220_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0b172a">
        <rect width="600" height="420" fill="#0b172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
        <text x="45" y="55" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Compliance & Audit Matrix</text>
        <g transform="translate(45, 80)">
          <rect x="0" y="0" width="500" height="32" rx="4" fill="#1e293b"/>
          <text x="16" y="20" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#93c5fd">Entity</text>
          <text x="150" y="20" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#93c5fd">Verification</text>
          <text x="280" y="20" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#93c5fd">Risk Rating</text>
          <text x="410" y="20" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#93c5fd">Status</text>
          
          <rect x="0" y="42" width="500" height="40" rx="4" fill="#0f172a"/>
          <text x="16" y="66" font-family="system-ui, sans-serif" font-size="11" fill="#ffffff">AASTU Academy</text>
          <text x="150" y="66" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">SHA-256 Verified</text>
          <text x="280" y="66" font-family="system-ui, sans-serif" font-size="10" fill="#34d399">Low (0.02)</text>
          <rect x="410" y="52" width="65" height="20" rx="10" fill="#065f46"/>
          <text x="442" y="66" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#6ee7b7" text-anchor="middle">ACTIVE</text>

          <rect x="0" y="90" width="500" height="40" rx="4" fill="#0f172a"/>
          <text x="16" y="114" font-family="system-ui, sans-serif" font-size="11" fill="#ffffff">Bahir Dar University</text>
          <text x="150" y="114" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">SHA-256 Verified</text>
          <text x="280" y="114" font-family="system-ui, sans-serif" font-size="10" fill="#34d399">Low (0.01)</text>
          <rect x="410" y="100" width="65" height="20" rx="10" fill="#065f46"/>
          <text x="442" y="114" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#6ee7b7" text-anchor="middle">ACTIVE</text>

          <rect x="0" y="138" width="500" height="40" rx="4" fill="#0f172a"/>
          <text x="16" y="162" font-family="system-ui, sans-serif" font-size="11" fill="#ffffff">Jimma College of Health</text>
          <text x="150" y="162" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Audit Pending</text>
          <text x="280" y="162" font-family="system-ui, sans-serif" font-size="10" fill="#fbbf24">Medium (0.4)</text>
          <rect x="410" y="148" width="65" height="20" rx="10" fill="#854d0e"/>
          <text x="442" y="162" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#fde047" text-anchor="middle">REVIEW</text>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p6',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p6.png',
    sizeBytes: 210_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0f172a">
        <rect width="600" height="420" fill="#0f172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <text x="45" y="55" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Network Latency & Geo-Routing</text>
        <!-- Map visualization -->
        <g transform="translate(45, 80)">
          <rect x="0" y="0" width="500" height="160" rx="6" fill="#0f172a"/>
          <circle cx="120" cy="80" r="12" fill="#3b82f6" opacity="0.4"/>
          <circle cx="120" cy="80" r="4" fill="#60a5fa"/>
          <text x="120" y="105" font-family="system-ui, sans-serif" font-size="9" fill="#93c5fd" text-anchor="middle">Addis Ababa Node (12ms)</text>
          
          <circle cx="280" cy="65" r="12" fill="#10b981" opacity="0.4"/>
          <circle cx="280" cy="65" r="4" fill="#34d399"/>
          <text x="280" y="90" font-family="system-ui, sans-serif" font-size="9" fill="#6ee7b7" text-anchor="middle">Regional Edge (18ms)</text>

          <circle cx="420" cy="110" r="12" fill="#f59e0b" opacity="0.4"/>
          <circle cx="420" cy="110" r="4" fill="#fbbf24"/>
          <text x="420" y="135" font-family="system-ui, sans-serif" font-size="9" fill="#fde047" text-anchor="middle">East Africa Hub (24ms)</text>
          
          <path d="M120 80 Q 200 40 280 65 T 420 110" stroke="#3b82f6" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
        </g>
        <g transform="translate(45, 260)">
          <rect x="0" y="0" width="240" height="60" rx="6" fill="#0f172a"/>
          <text x="16" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Median Throughput</text>
          <text x="16" y="46" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#38bdf8">1.42 GB/s</text>

          <rect x="260" y="0" width="240" height="60" rx="6" fill="#0f172a"/>
          <text x="276" y="24" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Active WebRTC Tunnels</text>
          <text x="276" y="46" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#34d399">1,480 Channels</text>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p7',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p7.png',
    sizeBytes: 235_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0b172a">
        <rect width="600" height="420" fill="#0b172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
        <text x="45" y="55" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Automated Proctoring Logs</text>
        <g transform="translate(45, 80)">
          <rect x="0" y="0" width="500" height="100" rx="6" fill="#0f172a"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#ffffff">Real-Time Examination Monitoring</text>
          <rect x="16" y="45" width="220" height="8" rx="2" fill="#2563eb"/>
          <rect x="16" y="60" width="180" height="8" rx="2" fill="#334155"/>
          <rect x="16" y="75" width="140" height="8" rx="2" fill="#334155"/>
          <circle cx="440" cy="50" r="30" fill="none" stroke="#10b981" stroke-width="6"/>
          <text x="440" y="55" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">100%</text>
        </g>
      </svg>
    `),
  },
  {
    id: 'sample-p8',
    name: '863660c1-fb68-45f4-b807-dee525d20c2d-p8.png',
    sizeBytes: 240_000,
    rotation: 0,
    url: svgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="#0f172a">
        <rect width="600" height="420" fill="#0f172a"/>
        <rect x="24" y="24" width="552" height="372" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <text x="45" y="55" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Mastara Enterprise Integration Specs</text>
        <g transform="translate(45, 85)">
          <rect x="0" y="0" width="500" height="80" rx="6" fill="#0f172a"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#38bdf8">End of Document Verification</text>
          <text x="16" y="48" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Digitally signed & encrypted with SHA-256 HMAC for portal delivery.</text>
          <rect x="16" y="58" width="460" height="6" rx="2" fill="#334155"/>
        </g>
        <g transform="translate(45, 185)">
          <rect x="0" y="0" width="500" height="110" rx="6" fill="#13233d" stroke="#1e3a5f" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#ffffff">Document Sign-off</text>
          <line x1="16" y1="50" x2="220" y2="50" stroke="#475569" stroke-width="1"/>
          <text x="16" y="65" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8">Academic Registrar Signature</text>
          <line x1="280" y1="50" x2="480" y2="50" stroke="#475569" stroke-width="1"/>
          <text x="280" y="65" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8">Portal Administrator Stamp</text>
        </g>
      </svg>
    `),
  },
];
