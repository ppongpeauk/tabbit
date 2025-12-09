"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { scanReceipt, type ScanReceiptResponse } from "@/utils/api";

export default function ScanPage() {
  const [receipt, setReceipt] = useState<ScanReceiptResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  const form = useForm({
    defaultValues: {
      image: null as File | null,
    },
    onSubmit: async ({ value }) => {
      if (!value.image) {
        setError("Please select an image file");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setReceipt(null);

      try {
        const result = await scanReceipt(value.image);
        setReceipt(result);
      } catch (err) {
        if (err instanceof Error) {
          // Try to parse JSON error responses
          try {
            const jsonError = JSON.parse(err.message);
            setReceipt(jsonError);
            setError(null);
          } catch {
            // Not JSON, show as regular error
            if (err.message.includes("Failed to scan receipt:")) {
              setError(err.message);
            } else {
              setError(err.message);
            }
          }
        } else {
          setError("Failed to scan receipt");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl text-center font-bold mb-8">Scan a receipt</h1>

      <div className="flex flex-row gap-8 w-full max-w-6xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex-1 max-w-md space-y-6"
        >
          <form.Field
            name="image"
            validators={{
              onChange: ({ value }) => {
                if (!value) {
                  return "Please select an image file";
                }
                if (!value.type.startsWith("image/")) {
                  return "File must be an image";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <label
                  htmlFor="image"
                  className="block text-sm font-medium text-gray-700"
                >
                  Upload Receipt Image
                </label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    field.handleChange(file);
                    setHasFile(!!file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isSubmitting}
                />
                {field.state.meta.errors && (
                  <p className="text-sm text-red-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !hasFile}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Scanning..." : "Scan Receipt"}
          </button>
        </form>

        <div className="flex-1 max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Scan Result</h2>
          {receipt ? (
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[600px]">
              <code className="text-sm">
                {JSON.stringify(receipt, null, 2)}
              </code>
            </pre>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-12 flex flex-col items-center justify-center min-h-[200px]">
              <p className="text-gray-500 text-sm">No scan result yet</p>
              <p className="text-gray-400 text-xs mt-2">
                Upload an image and click &quot;Scan Receipt&quot; to see
                results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
