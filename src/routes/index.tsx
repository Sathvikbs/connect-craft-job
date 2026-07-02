import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Redirect,
  head: () => ({
    meta: [
      { title: "JobConnect – Smart Online Job Portal" },
      { name: "description", content: "Connecting Talent With Opportunities. Browse 500+ jobs from top companies." },
    ],
  }),
});

function Redirect() {
  useEffect(() => {
    window.location.replace("/portal/index.html");
  }, []);
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <a href="/portal/index.html" style={{ color: "#2563EB", textDecoration: "none", fontSize: 18 }}>
        Loading JobConnect… click here if not redirected
      </a>
    </div>
  );
}
