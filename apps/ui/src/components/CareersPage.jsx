import React from 'react';

const CareersPage = () => {
  const roles = ["Neural Systems Architect", "Full Stack AI Engineer", "Security Governance Lead"];

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 lg:p-24 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        <h1 className="text-6xl font-black mb-4 tracking-tighter text-center">JOIN THE CORE</h1>
        <p className="text-gray-500 text-center mb-16">We don't hire employees; we recruit nodes for our collective intelligence.</p>

        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role} className="group flex justify-between items-center border border-gray-800 p-6 rounded-2xl hover:bg-white hover:text-black transition-all cursor-pointer">
              <h3 className="text-2xl font-bold">{role}</h3>
              <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full group-hover:bg-black uppercase">Open</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareersPage;