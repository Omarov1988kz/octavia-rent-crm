"use client";

import { useEffect, useState, type FormEvent } from "react";

type Deposit = {
  id?: string;
  car_class: string;
  deposit_amount: number | string;
};

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function emptyDeposit(): Deposit {
  return { car_class: "", deposit_amount: 10000 };
}

export default function DepositSettingsManager() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDeposits();
  }, []);

  async function loadDeposits() {
    setError(null);
    const response = await fetch("/api/admin/settings/deposits");
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка загрузки депозитов");
      return;
    }
    setDeposits(result?.deposits || []);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/settings/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deposits }),
    });
    const result = await parseJson(response);
    if (!response.ok) {
      setError(result?.message || "Ошибка сохранения депозитов");
      setSaving(false);
      return;
    }
    setDeposits(result?.deposits || []);
    setMessage("Депозиты сохранены");
    setSaving(false);
  }

  return (
    <div className="admin-grid">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-title">Депозиты</h1>
          <p className="admin-description">Суммы залога по классам автомобилей. Если класса нет в списке, используется 10 000 ₽.</p>
        </div>
      </header>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-card">
        <form className="admin-grid" onSubmit={handleSubmit}>
          <div className="admin-grid">
            {deposits.map((deposit, index) => (
              <div key={deposit.id ?? index} className="admin-grid-2">
                <label className="admin-label">
                  Класс автомобиля
                  <input className="admin-input" value={deposit.car_class} onChange={(event) => {
                    const next = [...deposits];
                    next[index] = { ...deposit, car_class: event.target.value };
                    setDeposits(next);
                  }} />
                </label>
                <label className="admin-label">
                  Залог, ₽
                  <input className="admin-input" type="number" min="0" step="1" value={deposit.deposit_amount} onChange={(event) => {
                    const next = [...deposits];
                    next[index] = { ...deposit, deposit_amount: event.target.value };
                    setDeposits(next);
                  }} />
                </label>
              </div>
            ))}
          </div>

          <div className="admin-actions">
            <button type="button" className="admin-button admin-button-secondary" onClick={() => setDeposits([...deposits, emptyDeposit()])}>
              Добавить класс
            </button>
            <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
