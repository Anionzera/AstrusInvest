import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Search, Filter, Download } from "lucide-react";

type DataTableProps<T> = {
  data: T[];
  columns: {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
  }[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  onRowClick?: (row: T) => void;
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
  }[];
  exportable?: boolean;
  onExport?: () => void;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  pagination = true,
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 10,
  onRowClick,
  actions = [],
  exportable = false,
  onExport,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Filtrar dados com base no termo de pesquisa
  const filteredData =
    searchTerm.trim() === ""
      ? data
      : data.filter((row) => {
          const keysToSearch =
            searchKeys.length > 0 ? searchKeys : Object.keys(row);

          return keysToSearch.some((key) => {
            const value = row[key];
            if (value === null || value === undefined) return false;
            return String(value)
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
          });
        });

  // Ordenar dados
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const comparison = String(aValue).localeCompare(String(bValue));
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : filteredData;

  // Paginação
  const totalPages = pagination
    ? Math.ceil(sortedData.length / rowsPerPage)
    : 1;
  const paginatedData = pagination
    ? sortedData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
      )
    : sortedData;

  // Manipuladores de eventos
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Resetar para a primeira página ao pesquisar
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1); // Resetar para a primeira página ao mudar o número de linhas
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {searchable && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-8 w-full sm:w-[300px]"
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          )}

          {pagination && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Filter className="h-4 w-4" />
                  {rowsPerPage} linhas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {rowsPerPageOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => handleRowsPerPageChange(option)}
                  >
                    {option} linhas
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="whitespace-nowrap">
                  {column.sortable ? (
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.header}
                      {sortKey === column.key &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {actions.length > 0 && <TableHead>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={
                    onRowClick
                      ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      : ""
                  }
                >
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            className="h-8 px-2"
                          >
                            {action.icon}
                            <span className="sr-only">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando{" "}
            {Math.min(sortedData.length, (currentPage - 1) * rowsPerPage + 1)} a{" "}
            {Math.min(sortedData.length, currentPage * rowsPerPage)} de{" "}
            {sortedData.length} resultados
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Lógica para mostrar páginas ao redor da página atual
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
