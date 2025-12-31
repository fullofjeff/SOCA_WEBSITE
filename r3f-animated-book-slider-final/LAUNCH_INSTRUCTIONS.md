# Launch Instructions

## Development Server Setup

### Prerequisites
- Node.js and npm installed
- All dependencies installed (`npm install`)

### Starting the Server

1. **Navigate to project directory:**
   ```bash
   cd "/Users/jeffreyfullerton/Desktop/MOUNTS/media (192.168.86.100)/SOCA_WEBSITE/r3f-animated-book-slider-final"
   ```

2. **Start development server with network access:**
   ```bash
   npm run dev -- --host
   ```

3. **Server will be available at:**
   - **Local:** http://localhost:5173/
   - **Network:** http://192.168.86.95:5173/
   - **Network:** http://100.116.71.37:5173/

### Accessing the Portfolio

**Working URL:** http://192.168.86.95:5173/portfolio

### Project Structure
- **Home Page:** `/` - Landing page
- **Portfolio Page:** `/portfolio` - Interactive 3D book portfolio

### Notes
- The `--host` flag is required for network access from other devices
- Server runs on port 5173 by default
- Background texture system is currently commented out in Experience.jsx for simplified rendering
- Server is hosted locally on the network interface

### Troubleshooting
- If connection is refused, ensure the server is running with `--host` flag
- Try alternative network URLs if one doesn't work
- Check firewall settings if accessing from external devices