export default function MenuPage() {
  return (
    <div className="page-root" style={{ 
      background: "#0b0b0b", 
      color: "#eee",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <header style={{ padding: "20px", fontSize: "6px", fontWeight: "600" }}>
        Menu
      </header>
      <main style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "4.5px", marginBottom: "12px" }}>
          Welcome to the menu page!
        </div>
        <div style={{ fontSize: "3.5px", color: "#999" }}>
          The landing Canvas has been unmounted and this is a fresh route.
        </div>
      </main>
    </div>
  );
}