import React from 'react';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 lg:p-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div>
          <h1 className="text-6xl font-black mb-8 tracking-tighter">CONTACT</h1>
          <p className="text-gray-400 mb-8">Direct line to the Nexus development team in Nairobi.</p>
          <div className="space-y-4 text-sm font-mono">
            <p className="text-blue-500">EMAIL: hello@nexuscore.ai</p>
            <p>LOC: Nairobi, Kenya // HQ-1</p>
          </div>
        </div>
        
        <form className="space-y-6">
          <input type="text" placeholder="NAME" className="w-full bg-transparent border-b border-gray-800 py-4 focus:border-blue-500 outline-none" />
          <input type="email" placeholder="EMAIL" className="w-full bg-transparent border-b border-gray-800 py-4 focus:border-blue-500 outline-none" />
          <textarea placeholder="MESSAGE" rows="4" className="w-full bg-transparent border-b border-gray-800 py-4 focus:border-blue-500 outline-none"></textarea>
          <button className="bg-white text-black font-black px-12 py-4 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest">Transmit</button>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;