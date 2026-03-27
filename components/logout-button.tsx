"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/merchant/logout", {
      method: "POST",
    });

    window.location.href = "/merchant/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl border bg-white border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
    >
      登出
    </button>
  );
}