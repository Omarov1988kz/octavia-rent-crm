"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Contract = {
  id: string;
  contract_number: number;
  contract_date: string;
  booking_id: string | null;
  client_name: string | null;
  car_name: string | null;
  car_plate_number: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = value.slice(0, 10);
  const [year, month, day] = normalized.split("-");
  return year && month && day ? `${day}.${month}.${year}` : normalized;
}

function formatCreated(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function carLabel(contract: Contract) {
  if (!contract.car_name && !contract.car_plate_number) return "—";
  return contract.car_plate_number ? `${contract.car_name || "Автомобиль"} · ${contract.car_plate_number}` : contract.car_name;
}

export default function ContractArchiveManager() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => contracts.length, [contracts]);

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/contracts");
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка загрузки архива договоров");
        setContracts([]);
        return;
      }
      setContracts(result?.contracts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка сети при загрузке архива договоров");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(contract: Contract) {
    const confirmed = window.confirm(`Удалить договор №${contract.contract_number} из архива? Номер не будет использован повторно.`);
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/contracts/${contract.id}`, { method: "DELETE" });
      const result = await parseJson(response);
      if (!response.ok) {
        setError(result?.message || "Ошибка удаления договора");
        return;
      }
      setMessage(`Договор №${contract.contract_number} удалён из архива`);
      await loadContracts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка удаления договора");
    }
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Архив договоров</h1>
          <p className="admin-description">История сформированных договоров аренды с короткой сквозной нумерацией.</p>
        </div>
        <button type="button" className="admin-button admin-button-secondary" onClick={loadContracts}>
          Обновить
        </button>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-grid-4">
        <div className="admin-card admin-stat">
          <div className="admin-stat-label">Договоров в архиве</div>
          <div className="admin-stat-value">{total}</div>
        </div>
      </section>

      <section className="admin-card">
        {loading ? <div className="admin-muted">Загрузка...</div> : null}
        {!loading && contracts.length === 0 ? (
          <div className="admin-empty">Архив договоров пока пуст.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата договора</th>
                  <th>Клиент</th>
                  <th>Автомобиль</th>
                  <th>Период аренды</th>
                  <th>Бронь</th>
                  <th>Создан</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td><strong>{contract.contract_number}</strong></td>
                    <td>{formatDate(contract.contract_date)}</td>
                    <td>{contract.client_name || "—"}</td>
                    <td>{carLabel(contract)}</td>
                    <td>{formatDate(contract.start_date)} — {formatDate(contract.end_date)}</td>
                    <td>{contract.booking_id ? <Link href="/admin/bookings">{contract.booking_id.slice(0, 8)}</Link> : "—"}</td>
                    <td>{formatCreated(contract.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        {contract.booking_id ? (
                          <a className="admin-button admin-button-primary" href={`/api/admin/contracts/rental/${contract.booking_id}`}>
                            Скачать
                          </a>
                        ) : null}
                        <button type="button" className="admin-button admin-button-danger" onClick={() => handleDelete(contract)}>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
