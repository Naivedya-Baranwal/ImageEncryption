import StegoPanel from './components/StegoPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl text-center font-bold mb-6">StegoTool</h1>
            <p className="text-center text-xl text-gray-600 mb-6">
        Tool to hide secret messages inside images and extract them securely.
      </p>
      <StegoPanel />
    </div>
  );
}
export default App;
