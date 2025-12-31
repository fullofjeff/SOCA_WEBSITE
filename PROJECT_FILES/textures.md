# Wedge Texture Specifications

## Geometry Overview
The page block wedges use `ExtrudeGeometry` with shape on XY plane, extruded along Z.

### Dimensions
- **Main surfaces (lids)**: 1.30 x 1.71 (PAGE_WIDTH x PAGE_HEIGHT)
- **Edge thickness**: 0.15

## Face Mapping (sideId)

| sideId | Face | Normal | Description | Texture Required |
|--------|------|--------|-------------|------------------|
| 0 | Front lid | +Z | Main visible angled surface | Yes (different for L/R) |
| 1 | Back lid | -Z | Hidden against book interior | No (use PAPER_COLOR) |
| 2 | Top edge | +Y | Top page edges | Yes (shared L/R) |
| 3 | Bottom edge | -Y | Bottom page edges | Yes (shared L/R) |
| 4 | Spine edge | -X | Hidden by spine mesh | No (use PAPER_COLOR) |
| 5 | Fore-edge | +X | Visible right edge of pages | Yes (shared L/R) |

## Texture Files Needed

### Main Surfaces (Different per wedge)
- `wedge-left-main.jpg` - Left wedge main surface (1.30 x 1.71)
- `wedge-right-main.jpg` - Right wedge main surface (1.30 x 1.71)

### Edge Textures (Shared by both wedges)
- `page-edge-top.jpg` - Top edge (1.30 x 0.15)
- `page-edge-bottom.jpg` - Bottom edge (1.30 x 0.15)
- `page-edge-fore.jpg` - Fore-edge (1.71 x 0.15)

## Material Array Structure

```javascript
// Material index matches sideId from geometry group sorting
const wedgeMaterials = [
  material0,  // sideId 0: Front lid (main surface)
  material1,  // sideId 1: Back lid (hidden)
  material2,  // sideId 2: Top edge
  material3,  // sideId 3: Bottom edge
  material4,  // sideId 4: Spine edge (hidden)
  material5,  // sideId 5: Fore-edge
];
```

## Notes
- Coordinate system is checked BEFORE mesh rotation (inside useMemo)
- Normals are reliable at geometry creation time
- Both wedges share same geometry, different material arrays
