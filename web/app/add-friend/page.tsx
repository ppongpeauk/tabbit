/**
 * @author Composer
 * @description Web page that redirects to app deep link for adding friends
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AddFriendPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Try to open the app with deep link
    const appUrl = `tabbit://add-friend?token=${encodeURIComponent(token)}`;

    // Attempt to open the app
    window.location.href = appUrl;
    setAttempted(true);

    // Fallback: if app doesn't open within 2 seconds, show instructions
    const timeout = setTimeout(() => {
      // Could show a message or redirect to app store
    }, 2000);

    return () => clearTimeout(timeout);
  }, [token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Invalid Friend Request
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This friend request link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Opening Tabbit...
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {attempted
            ? "If the app didn't open, make sure you have Tabbit installed."
            : "Redirecting to the Tabbit app to add this friend."}
        </p>
        {attempted && (
          <div className="mt-6">
            <a
              href={`tabbit://add-friend?token=${encodeURIComponent(token)}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Open in Tabbit
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
