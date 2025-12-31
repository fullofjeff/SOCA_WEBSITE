# 🚀 MASTER LAUNCH GUIDE
## R3F Animated Book Slider - SOCA Website

### 📋 Quick Start Checklist
- ✅ Ensure you're on the mounted drive: `192.168.86.100`
- ✅ Navigate to project directory
- ✅ Start development server with network access
- ✅ Access via working network URL

---

## 🌟 Current Branch: `feature/mouse-animation-testing`

This branch contains the latest menu styling updates and enhanced interactive features.

### 🎯 Available Components & Pages

#### 1. **Landing Page** - `/` (Main Experience)
- **Password Entry**: `magic`, `soca`, or `enter`
- **Interactive 3D Card**: Mouse-reactive animations
- **Menu Overlay**: Appears after video completion with navigation to WONDER, DREAM, BELIEVE

#### 2. **Book Test Components** - `/book-test`
- **Book_Test.jsx**: Advanced 3D book with page-turning animation
- **Experience_Test.jsx**: Complete 3D scene with lighting and controls
- **Features**: 
  - Physics-based page turning
  - Skinned mesh animation
  - Cover and page textures
  - Click to open/close functionality

#### 3. **Menu Page** - `/menu`
- Standalone menu page (accessible via `soca` or `enter` passwords)
- Enhanced typography and spacing

#### 4. **Test Pages**
- **TestPage.jsx**: Development testing environment
- **ParticleTestPage.jsx**: Particle system testing

---

## 🖥️ Launch Instructions

### Step 1: Navigate to Project
```bash
cd "/Users/jeffreyfullerton/Desktop/MOUNTS/media (192.168.86.100)/SOCA_WEBSITE/r3f-animated-book-slider-final"
```

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Start Development Server
```bash
npm run dev -- --host
```

### Step 4: Access the Application
**Primary Network URL:** `http://192.168.86.95:5173/`

**Alternative URLs (if primary fails):**
- `http://localhost:5173/` (local only)
- `http://100.116.71.37:5173/` (alternative network)

---

## 🎨 Testing the Book Component

### Book_Test Component Features:
- **16-page book** with front/back covers
- **Skinned mesh animation** for realistic page bending
- **Physics simulation** with page curl effects
- **Interactive spine** with title text
- **Texture mapping** for covers and pages
- **Click interaction** to open/close book

### To Test Book Component:
1. Navigate to the test route or component
2. **Click the book** to open/close
3. **Hover over pages** for cursor feedback
4. Observe **realistic page turning** with curl physics

---

## 🎮 Interactive Features

### Landing Page Interactions:
- **Password Entry**: Type password and press Enter
- **Mouse Reactivity**: Move mouse over card for 3D effects  
- **Menu Navigation**: Click WONDER/DREAM/BELIEVE after video
- **Card Flipping**: Click to flip card (before video completion)

### Book Test Interactions:
- **Click Book**: Opens/closes with animated page turning
- **Hover Pages**: Visual feedback and cursor changes
- **Physics**: Realistic page bending and spine behavior

---

## 🔧 Development Notes

### Current Branch Status:
- **Active**: `feature/mouse-animation-testing`
- **Latest Commit**: Menu styling and layout updates
- **Network Server**: Running with `--host` flag for external access

### Key Files Modified:
- `src/pages/LandingPage.jsx` - Enhanced menu overlay
- `src/pages/MenuPage.jsx` - Improved typography
- `src/components/Book_Test.jsx` - Advanced book physics
- `src/components/Experience_Test.jsx` - 3D scene setup

### Asset Requirements:
- **Textures**: `/textures/` folder with page and cover images
- **SVG Icons**: Menu navigation symbols (wonder.svg, dream.svg, etc.)
- **Video**: Background animation for landing page

---

## 🌐 Network Configuration

### Server Setup:
- **Port**: 5173 (Vite default)
- **Host**: `0.0.0.0` (network accessible)
- **Mount**: Remote media server `192.168.86.100`

### Troubleshooting:
1. **Connection Refused**: Ensure server runs with `--host` flag
2. **Asset Loading**: Check texture paths in `/public/textures/`
3. **Performance**: Monitor console for WebGL warnings
4. **Mobile Access**: Use network IP, not localhost

---

## 📝 Password Reference

| Password | Action |
|----------|--------|
| `magic` | Triggers video → menu overlay |
| `soca` | Direct navigation to menu page |
| `enter` | Direct navigation to menu page |

---

## 🎯 Testing Checklist

### Landing Page:
- [ ] Card mouse reactivity works
- [ ] Password entry functions correctly
- [ ] Video plays after "magic" password
- [ ] Menu appears after video completion
- [ ] Navigation links work (WONDER/DREAM/BELIEVE)

### Book Test:
- [ ] Book opens/closes on click
- [ ] Pages turn with realistic physics
- [ ] Textures load correctly
- [ ] Hover effects work
- [ ] Spine displays title text

### Network Access:
- [ ] Server accessible from other devices
- [ ] Assets load over network
- [ ] Performance acceptable on external access

---

## 🚨 Known Issues & Fixes

### Common Issues:
1. **Textures not loading**: Check `/public/textures/` folder exists
2. **Network access blocked**: Verify firewall settings
3. **Performance lag**: Monitor browser dev tools for errors
4. **Mobile compatibility**: Test touch interactions

### Quick Fixes:
```bash
# Restart server with proper host flag
npm run dev -- --host

# Clear cache if assets don't load
Ctrl+Shift+R (hard refresh)

# Check git branch
git branch -a
```

---

*Last Updated: August 27, 2024*  
*Branch: feature/mouse-animation-testing*  
*Network: 192.168.86.100 (mounted drive)*