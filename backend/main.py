import csv
import io
from datetime import date, datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import (
    Account, AccountCreate, AccountUpdate,
    SaldoHistorie, SaldoHistorieCreate,
    RendementJaren, RendementCreate,
    Jaaropgave, JaaropgaveCreate,
    Schuld, SchuldCreate, SchuldUpdate,
)

app = FastAPI(title="Vermogensdashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Zet inleg van alle spaarrekeningen op 0
    with next(get_session()) as session:
        spaarrekeningen = session.exec(select(Account).where(Account.type == "sparen")).all()
        for acc in spaarrekeningen:
            if acc.inleg != 0:
                acc.inleg = 0
                session.add(acc)
        session.commit()


# --- Accounts ---

@app.get("/api/accounts", response_model=List[Account])
def get_accounts(session: Session = Depends(get_session)):
    return session.exec(select(Account)).all()


@app.post("/api/accounts", response_model=Account)
def create_account(account: AccountCreate, session: Session = Depends(get_session)):
    db_account = Account(**account.model_dump(), bijgewerkt_op=datetime.utcnow())
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account


@app.put("/api/accounts/{account_id}", response_model=Account)
def update_account(account_id: int, account: AccountUpdate, session: Session = Depends(get_session)):
    db_account = session.get(Account, account_id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Account niet gevonden")
    update_data = account.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_account, key, value)
    db_account.bijgewerkt_op = datetime.utcnow()
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account


@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    db_account = session.get(Account, account_id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Account niet gevonden")
    # Delete related history
    histories = session.exec(select(SaldoHistorie).where(SaldoHistorie.account_id == account_id)).all()
    for h in histories:
        session.delete(h)
    session.delete(db_account)
    session.commit()
    return {"ok": True}


# --- Saldo Historie ---

@app.get("/api/accounts/{account_id}/historie", response_model=List[SaldoHistorie])
def get_historie(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account niet gevonden")
    return session.exec(
        select(SaldoHistorie)
        .where(SaldoHistorie.account_id == account_id)
        .order_by(SaldoHistorie.datum)
    ).all()


@app.post("/api/accounts/{account_id}/historie", response_model=SaldoHistorie)
def add_historie(account_id: int, historie: SaldoHistorieCreate, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account niet gevonden")
    db_historie = SaldoHistorie(account_id=account_id, **historie.model_dump())
    session.add(db_historie)
    session.commit()
    session.refresh(db_historie)
    return db_historie


@app.get("/api/historie/totaal")
def get_totaal_historie(session: Session = Depends(get_session)):
    histories = session.exec(select(SaldoHistorie).order_by(SaldoHistorie.datum)).all()
    # Group by month
    from collections import defaultdict
    monthly = defaultdict(float)
    for h in histories:
        key = h.datum.strftime("%Y-%m")
        monthly[key] += h.saldo
    result = [{"datum": k, "saldo": v} for k, v in sorted(monthly.items())]
    return result


# --- Schulden ---

@app.get("/api/schulden", response_model=List[Schuld])
def get_schulden(session: Session = Depends(get_session)):
    return session.exec(select(Schuld)).all()


@app.post("/api/schulden", response_model=Schuld)
def create_schuld(schuld: SchuldCreate, session: Session = Depends(get_session)):
    db_schuld = Schuld(**schuld.model_dump(), bijgewerkt_op=datetime.utcnow())
    session.add(db_schuld)
    session.commit()
    session.refresh(db_schuld)
    return db_schuld


@app.put("/api/schulden/{schuld_id}", response_model=Schuld)
def update_schuld(schuld_id: int, schuld: SchuldUpdate, session: Session = Depends(get_session)):
    db_schuld = session.get(Schuld, schuld_id)
    if not db_schuld:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    for key, value in schuld.model_dump(exclude_unset=True).items():
        setattr(db_schuld, key, value)
    db_schuld.bijgewerkt_op = datetime.utcnow()
    session.add(db_schuld)
    session.commit()
    session.refresh(db_schuld)
    return db_schuld


@app.delete("/api/schulden/{schuld_id}")
def delete_schuld(schuld_id: int, session: Session = Depends(get_session)):
    db_schuld = session.get(Schuld, schuld_id)
    if not db_schuld:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    session.delete(db_schuld)
    session.commit()
    return {"ok": True}


# --- Vermogensgroei ---

@app.get("/api/vermogensgroei")
def get_vermogensgroei(session: Session = Depends(get_session)):
    """
    Geeft per jaar het totale vermogen en het vermogen per account,
    gebaseerd op de laatste saldo-registratie van dat jaar.
    """
    from collections import defaultdict
    accounts = session.exec(select(Account)).all()
    histories = session.exec(select(SaldoHistorie).order_by(SaldoHistorie.datum)).all()

    # Per account: laatste saldo per jaar
    account_jaar_saldo = defaultdict(dict)  # {account_id: {jaar: saldo}}
    for h in histories:
        jaar = h.datum.year
        account_jaar_saldo[h.account_id][jaar] = h.saldo

    # Verzamel alle jaren
    alle_jaren = sorted({h.datum.year for h in histories})

    resultaat = []
    for jaar in alle_jaren:
        entry = {"jaar": jaar, "totaal": 0}
        for acc in accounts:
            # Gebruik laatste bekende saldo tot en met dit jaar
            saldo = 0
            for j in sorted(account_jaar_saldo[acc.id].keys()):
                if j <= jaar:
                    saldo = account_jaar_saldo[acc.id][j]
            entry[acc.naam] = saldo
            entry["totaal"] += saldo
        resultaat.append(entry)

    account_info = [{"naam": acc.naam, "kleur": acc.kleur} for acc in accounts]
    return {"jaren": resultaat, "accounts": account_info}


# --- Import ---

@app.post("/api/import")
async def import_csv(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """
    Importeer historische saldo data via CSV.
    Verwachte kolommen: account_naam, datum (YYYY-MM-DD), saldo
    Optionele kolom: inleg
    Onbekende accounts worden automatisch aangemaakt.
    Duplicaten (zelfde account + datum) worden overgeslagen.
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    required = {"account_naam", "datum", "saldo"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail=f"CSV moet kolommen bevatten: {', '.join(required)}")

    ingevoegd = 0
    overgeslagen = 0
    fouten = []

    for i, row in enumerate(reader, start=2):
        try:
            naam = row["account_naam"].strip()
            datum = date.fromisoformat(row["datum"].strip())
            saldo = float(row["saldo"].replace(",", ".").strip())
            inleg = float(row["inleg"].replace(",", ".").strip()) if "inleg" in row and row["inleg"].strip() else 0.0
        except Exception as e:
            fouten.append(f"Rij {i}: {e}")
            continue

        account = session.exec(select(Account).where(Account.naam == naam)).first()
        if not account:
            account = Account(naam=naam, type="sparen", saldo=saldo, inleg=inleg, kleur="#c9a84c", bijgewerkt_op=datetime.utcnow())
            session.add(account)
            session.flush()

        existing = session.exec(
            select(SaldoHistorie)
            .where(SaldoHistorie.account_id == account.id)
            .where(SaldoHistorie.datum == datum)
        ).first()
        if existing:
            overgeslagen += 1
            continue

        session.add(SaldoHistorie(account_id=account.id, datum=datum, saldo=saldo))
        ingevoegd += 1

    session.commit()
    return {"ingevoegd": ingevoegd, "overgeslagen": overgeslagen, "fouten": fouten}


# --- Rendement ---

@app.get("/api/rendement", response_model=List[RendementJaren])
def get_rendement(session: Session = Depends(get_session)):
    return session.exec(select(RendementJaren).order_by(RendementJaren.jaar)).all()


@app.post("/api/rendement", response_model=RendementJaren)
def upsert_rendement(rendement: RendementCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(RendementJaren).where(RendementJaren.jaar == rendement.jaar)
    ).first()
    if existing:
        for key, value in rendement.model_dump().items():
            setattr(existing, key, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    db_rendement = RendementJaren(**rendement.model_dump())
    session.add(db_rendement)
    session.commit()
    session.refresh(db_rendement)
    return db_rendement


# --- Jaaropgave ---

@app.get("/api/jaaropgave", response_model=List[Jaaropgave])
def get_jaaropgave(session: Session = Depends(get_session)):
    return session.exec(select(Jaaropgave).order_by(Jaaropgave.jaar.desc())).all()


@app.get("/api/jaaropgave/{jaar}", response_model=Jaaropgave)
def get_jaaropgave_jaar(jaar: int, session: Session = Depends(get_session)):
    result = session.exec(select(Jaaropgave).where(Jaaropgave.jaar == jaar)).first()
    if not result:
        raise HTTPException(status_code=404, detail="Jaaropgave niet gevonden")
    return result


@app.post("/api/jaaropgave", response_model=Jaaropgave)
def upsert_jaaropgave(opgave: JaaropgaveCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(Jaaropgave).where(Jaaropgave.jaar == opgave.jaar)
    ).first()
    if existing:
        for key, value in opgave.model_dump().items():
            setattr(existing, key, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    db_opgave = Jaaropgave(**opgave.model_dump())
    session.add(db_opgave)
    session.commit()
    session.refresh(db_opgave)
    return db_opgave


# --- Instellingen / Data beheer ---

@app.get("/api/export")
def export_all(session: Session = Depends(get_session)):
    """Exporteer alle data als JSON."""
    accounts = session.exec(select(Account)).all()
    histories = session.exec(select(SaldoHistorie)).all()
    schulden = session.exec(select(Schuld)).all()
    rendement = session.exec(select(RendementJaren)).all()
    jaaropgave = session.exec(select(Jaaropgave)).all()
    return {
        "accounts": [a.model_dump() for a in accounts],
        "saldo_historie": [h.model_dump() for h in histories],
        "schulden": [s.model_dump() for s in schulden],
        "rendement_jaren": [r.model_dump() for r in rendement],
        "jaaropgave": [j.model_dump() for j in jaaropgave],
    }


@app.delete("/api/data/historie")
def delete_all_historie(session: Session = Depends(get_session)):
    """Verwijder alle historische saldo-data."""
    records = session.exec(select(SaldoHistorie)).all()
    for r in records:
        session.delete(r)
    session.commit()
    return {"verwijderd": len(records)}


@app.post("/api/import/json")
async def import_json(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """
    Importeer alle data vanuit een eerder geëxporteerd JSON-bestand.
    Verwachte structuur: { accounts, saldo_historie, schulden, rendement_jaren, jaaropgave }
    Bestaande records worden overgeslagen op basis van unieke sleutels.
    """
    content = await file.read()
    try:
        data = __import__('json').loads(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Ongeldig JSON-bestand")

    counts = {"accounts": 0, "saldo_historie": 0, "schulden": 0, "rendement_jaren": 0, "jaaropgave": 0}
    naam_to_id = {}

    # Accounts
    for a in data.get("accounts", []):
        existing = session.exec(select(Account).where(Account.naam == a["naam"])).first()
        if existing:
            naam_to_id[a["naam"]] = existing.id
            # update saldo/inleg/kleur/type
            existing.saldo = a.get("saldo", existing.saldo)
            existing.inleg = a.get("inleg", existing.inleg)
            existing.kleur = a.get("kleur", existing.kleur)
            existing.type = a.get("type", existing.type)
            session.add(existing)
        else:
            acc = Account(
                naam=a["naam"], type=a.get("type", "sparen"),
                saldo=a.get("saldo", 0), inleg=a.get("inleg", 0),
                kleur=a.get("kleur", "#c9a84c"),
                bijgewerkt_op=datetime.utcnow(),
            )
            session.add(acc)
            session.flush()
            naam_to_id[a["naam"]] = acc.id
            counts["accounts"] += 1
    session.flush()

    # Rebuild naam_to_id from DB (for existing accounts not in export)
    all_accounts = session.exec(select(Account)).all()
    db_id_to_naam = {acc.id: acc.naam for acc in all_accounts}
    # Also map old export IDs: build old_id -> naam from export
    old_id_to_naam = {a["id"]: a["naam"] for a in data.get("accounts", []) if "id" in a}

    # Saldo historie
    for h in data.get("saldo_historie", []):
        acc_naam = old_id_to_naam.get(h.get("account_id"))
        if not acc_naam or acc_naam not in naam_to_id:
            continue
        real_account_id = naam_to_id[acc_naam]
        datum = date.fromisoformat(h["datum"]) if isinstance(h["datum"], str) else h["datum"]
        existing = session.exec(
            select(SaldoHistorie)
            .where(SaldoHistorie.account_id == real_account_id)
            .where(SaldoHistorie.datum == datum)
        ).first()
        if not existing:
            session.add(SaldoHistorie(account_id=real_account_id, datum=datum, saldo=h["saldo"]))
            counts["saldo_historie"] += 1

    # Schulden
    for s in data.get("schulden", []):
        existing = session.exec(select(Schuld).where(Schuld.naam == s["naam"])).first()
        if not existing:
            session.add(Schuld(
                naam=s["naam"], type=s.get("type", "overig"),
                bedrag=s.get("bedrag", 0), kleur=s.get("kleur", "#f87171"),
                bijgewerkt_op=datetime.utcnow(),
            ))
            counts["schulden"] += 1

    # Rendement jaren
    for r in data.get("rendement_jaren", []):
        existing = session.exec(select(RendementJaren).where(RendementJaren.jaar == r["jaar"])).first()
        if not existing:
            session.add(RendementJaren(
                jaar=r["jaar"], rendement_pct=r.get("rendement_pct"),
                rendement_abs=r.get("rendement_abs"), benchmark_pct=r.get("benchmark_pct"),
            ))
            counts["rendement_jaren"] += 1

    # Jaaropgave
    for j in data.get("jaaropgave", []):
        existing = session.exec(select(Jaaropgave).where(Jaaropgave.jaar == j["jaar"])).first()
        if not existing:
            session.add(Jaaropgave(
                jaar=j["jaar"], saldo_begin=j.get("saldo_begin", 0),
                saldo_eind=j.get("saldo_eind", 0), inleg=j.get("inleg", 0),
                heffingsvrij_vermogen=j.get("heffingsvrij_vermogen", 57000.0),
            ))
            counts["jaaropgave"] += 1

    session.commit()
    return counts


@app.delete("/api/data/alles")
def delete_all_data(session: Session = Depends(get_session)):
    """Verwijder alle data (accounts, historie, schulden, rendement, jaaropgave)."""
    counts = {}
    for model, name in [
        (SaldoHistorie, "saldo_historie"),
        (Account, "accounts"),
        (Schuld, "schulden"),
        (RendementJaren, "rendement_jaren"),
        (Jaaropgave, "jaaropgave"),
    ]:
        records = session.exec(select(model)).all()
        counts[name] = len(records)
        for r in records:
            session.delete(r)
    session.commit()
    return counts
