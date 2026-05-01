export function StatusPage() {
  const services = [
    { name: "Website", status: "operational" },
    { name: "API", status: "operational" },
    { name: "Database", status: "operational" },
    { name: "AI Services", status: "operational" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">System Status</h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border rounded-xl shadow-lg">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex justify-between items-center p-4 border-b last:border-b-0"
            >
              <span className="font-semibold">{service.name}</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  service.status === "operational"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
