'use client';

interface HeaderAdminProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  adminUser: any;
  esSuperUser: boolean;
  isReadOnlyVen911: boolean;
  onLogout: () => void;
  onEditProfile: () => void;
  onManageAdmins: () => void;
}

export function HeaderAdmin({
  activeTab,
  setActiveTab,
  adminUser,
  esSuperUser,
  isReadOnlyVen911,
  onLogout,
  onEditProfile,
  onManageAdmins
}: HeaderAdminProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <h1 className="text-xl font-bold text-gray-800">Panel de Administración</h1>
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('directorio')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'directorio' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Directorio
          </button>
          <button
            onClick={() => setActiveTab('incidencias')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'incidencias' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Incidencias
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'reportes' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reportes
          </button>
          <button
            onClick={() => setActiveTab('catalogos')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'catalogos' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Catálogos
          </button>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            {adminUser?.email || 'Administrador'}
          </p>
          <div className="flex gap-1 justify-end mt-0.5">
            {esSuperUser && (
              <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded">
                SuperUser
              </span>
            )}
            {isReadOnlyVen911 && (
              <span className="text-[10px] bg-yellow-100 text-yellow-800 font-semibold px-1.5 py-0.5 rounded">
                Solo Lectura
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="text-sm bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 px-3 py-2 rounded-md font-medium transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}