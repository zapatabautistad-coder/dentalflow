import { redirect } from "next/navigation";

// La raíz lleva al panel; el proxy manda a /login si no hay sesión.
export default function Home() {
  redirect("/panel");
}
