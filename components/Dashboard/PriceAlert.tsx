import { useState } from 'react';
import { Bell, MessageCircle, Mail, Sparkles } from 'lucide-react';

export default function PriceAlert() {
  const [category, setCategory] = useState('MCX');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [alertType, setAlertType] = useState('Price');
  const [percentageType, setPercentageType] = useState('gain');
  const [notificationMethods, setNotificationMethods] = useState({
    webApp: false,
    whatsApp: false,
    email: false
  });
  const [customMessage, setCustomMessage] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [targetPercentage, setTargetPercentage] = useState('');

  const suppliers = ['NALCO', 'HINDALCO', 'Vedanta'];

  const handleSupplierToggle = (supplier: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplier)
        ? prev.filter(s => s !== supplier)
        : [...prev, supplier]
    );
  };

  const handleCreateAlert = () => {
    console.log({
      category,
      selectedSuppliers,
      alertType,
      percentageType,
      notificationMethods,
      customMessage,
      targetPrice,
      targetPercentage
    });
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-pink-50/90 rounded-xl p-4 md:p-6
      border border-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] 
      transition-all duration-300 w-full">
      
      {/* Blur overlay - reduced opacity */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] z-10 rounded-xl opacity-70"></div>

      {/* Small Coming Soon card at the top */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xs">
        <div className="bg-white/90 border border-blue-100 rounded-lg p-3 shadow-md text-center backdrop-blur-[2px] mx-4">
          <div className="inline-flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Coming Soon - Next Update</span>
          </div>
        </div>
      </div>

      {/* Original content (blurred with reduced opacity) */}
      <div className="blur-[1px] opacity-80 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Price Alert
            </h2>
          </div>
          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3" />
            AluminiumGenie
          </span>
        </div>

        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {['MCX', 'LME', 'Suppliers'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                    category === cat
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Selection or Alert Type */}
          {category === 'Suppliers' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Suppliers
              </label>
              <div className="space-y-2">
                {suppliers.map((supplier) => (
                  <label
                    key={supplier}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier)}
                      onChange={() => handleSupplierToggle(supplier)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{supplier}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alert Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Price', 'Percentage'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setAlertType(type)}
                    className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                      alertType === type
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target Price/Percentage Input */}
          {category !== 'Suppliers' && (
            alertType === 'Price' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target Price ({category === 'LME' ? 'USD' : '₹'})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {category === 'LME' ? '$' : '₹'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter target price"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Percentage Change
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={percentageType}
                    onChange={(e) => setPercentageType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gain">Gain</option>
                    <option value="loss">Loss</option>
                    <option value="gainloss">Gain/Loss</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter percentage"
                  />
                </div>
              </div>
            )
          )}

          {/* Notification Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notification Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setNotificationMethods(prev => ({ ...prev, webApp: !prev.webApp }))}
                className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm ${
                  notificationMethods.webApp
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                Web App
              </button>
              <button
                onClick={() => setNotificationMethods(prev => ({ ...prev, whatsApp: !prev.whatsApp }))}
                className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm ${
                  notificationMethods.whatsApp
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => setNotificationMethods(prev => ({ ...prev, email: !prev.email }))}
                className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm ${
                  notificationMethods.email
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Custom Message (Optional)
            </label>
            <textarea
              placeholder="Add a custom message for your alert"
              className="w-full p-2 border border-gray-200 rounded-lg bg-white h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </div>

          {/* Create Alert Button */}
          <button 
            onClick={handleCreateAlert}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg 
              flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Bell className="w-4 h-4" />
            Create Alert
          </button>
        </div>
      </div>
    </div>
  );
}