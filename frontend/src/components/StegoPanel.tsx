import React, { useState, useRef } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function StegoPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"encrypt"|"decrypt" | null>(null);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setMessage("");
    setPassword("");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setMode(null);
      setResult(null);
      
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      return () => URL.revokeObjectURL(url);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setMode(null);
      setResult(null);
      
      // Create preview URL
      const url = URL.createObjectURL(droppedFile);
      setPreviewUrl(url);
    }
  };

  async function handleEncrypt() {
    if (!file) {
      toast.error("Please upload an image first");
      return;
    }
    if (!message) {
      toast.error("Please enter a message to encrypt");
      return;
    }
    if (!password) {
      toast.error("Password is required for encryption");
      return;
    }
    
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("message", message);
    fd.append("password", password);

    try {
      const resp = await fetch("/api/stego/encrypt", { method: "POST", body: fd });
      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.message || err.error || "Failed to encrypt");
        setResult("Error: " + (err.error || JSON.stringify(err)));
        setLoading(false);
        return;
      }
      
      // response is a file download; we can create blob and trigger download
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stego-${Date.now()}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Image encrypted and downloaded successfully!");
      setLoading(false);
      setResult("Encrypted image downloaded");
      resetForm(); 
    } catch (error) {
      toast.error("An error occurred during encryption");
      setLoading(false);
    }
  }

  async function handleDecrypt() {
    if (!file) {
      toast.error("Please upload an image first");
      return;
    }
    
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("image", file);
    if (password) fd.append("password", password);

    try {
      const resp = await fetch("/api/stego/decrypt", { method: "POST", body: fd });
      const data = await resp.json();
      
      if (!resp.ok) {
        if (data.code === "NOT_ENCRYPTED") {
          toast.error("This image does not contain any encrypted data");
        } else if (data.code === "WRONG_PASSWORD") {
          toast.error("Incorrect password. Please try again");
        } else if (data.code === "PASSWORD_REQUIRED") {
          toast.warning("This image is password protected. Please provide a password");
        } else {
          toast.error(data.message || data.error || "Failed to decrypt");
        }
        
        setResult("Error: " + (data.error || JSON.stringify(data)));
      } else {
        toast.success("Message decrypted successfully!");
        setResult(data.message || "No message");
        resetForm(); // Clear inputs after successful operation
      }
    } catch (error) {
      toast.error("An error occurred during decryption");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white rounded-lg m-auto shadow-lg p-6">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {!file ? (
        <div 
          className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-700">Drag & Drop your image here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse files</p>
            <p className="text-xs text-gray-400 mt-2">PNG format recommended</p>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={onFile} 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center mb-4">
            {previewUrl && (
              <div className="mr-4 w-24 h-24 overflow-hidden rounded border">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              <button 
                className="text-sm text-red-500 mt-1 hover:underline"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setMode(null);
                  setResult(null);
                  resetForm();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove
              </button>
            </div>
          </div>
          
          <div className="flex gap-4 mb-4">
            <button 
              className={`px-4 py-2 rounded-lg flex-1 transition-colors ${mode === 'encrypt' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`} 
              onClick={() => setMode("encrypt")}
            >
              Encrypt
            </button>
            <button 
              className={`px-4 py-2 rounded-lg flex-1 transition-colors ${mode === 'decrypt' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`} 
              onClick={() => setMode("decrypt")}
            >
              Decrypt
            </button>
          </div>

          {mode === "encrypt" && (
            <div className="mt-4 flex flex-col gap-3 bg-blue-50 p-4 rounded-lg">
              <label className="font-medium text-blue-800">Secret Message</label>
              <textarea 
                placeholder="Enter your secret message here..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                className="border border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={4}
              />
              <label className="font-medium text-blue-800">Password</label>
              <input 
                type="password" 
                placeholder="Enter encryption password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="border border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              />
              <button 
                className="mt-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center" 
                onClick={handleEncrypt} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Encrypting...
                  </>
                ) : "Encrypt & Download"}
              </button>
            </div>
          )}

          {mode === "decrypt" && (
            <div className="mt-4 flex flex-col gap-3 bg-green-50 p-4 rounded-lg">
              <label className="font-medium text-green-800">Password (if required)</label>
              <input 
                type="password" 
                placeholder="Enter decryption password if needed" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="border border-green-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
              />
              <button 
                className="mt-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center" 
                onClick={handleDecrypt} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Decrypting...
                  </>
                ) : "Decrypt"}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Result:</h3>
              <pre className="p-4 bg-gray-100 rounded-lg overflow-auto max-h-60 text-sm">{result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

