import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to player - this app is for the Tauri desktop app only
  redirect("/player");
}
