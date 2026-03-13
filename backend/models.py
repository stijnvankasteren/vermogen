from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Account(SQLModel, table=True):
    __tablename__ = "accounts"
    id: Optional[int] = Field(default=None, primary_key=True)
    naam: str
    type: str  # sparen / beleggen / crypto / pensioen
    saldo: float
    inleg: float
    kleur: str
    bijgewerkt_op: datetime = Field(default_factory=datetime.utcnow)


class SaldoHistorie(SQLModel, table=True):
    __tablename__ = "saldo_historie"
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="accounts.id")
    datum: date
    saldo: float


class RendementJaren(SQLModel, table=True):
    __tablename__ = "rendement_jaren"
    id: Optional[int] = Field(default=None, primary_key=True)
    jaar: int
    rendement_pct: Optional[float] = None
    rendement_abs: Optional[float] = None
    benchmark_pct: Optional[float] = None


class Jaaropgave(SQLModel, table=True):
    __tablename__ = "jaaropgave"
    id: Optional[int] = Field(default=None, primary_key=True)
    jaar: int
    saldo_begin: float
    saldo_eind: float
    inleg: float
    heffingsvrij_vermogen: float = 57000.0


class Schuld(SQLModel, table=True):
    __tablename__ = "schulden"
    id: Optional[int] = Field(default=None, primary_key=True)
    naam: str
    type: str  # hypotheek / lening / creditcard / overig
    bedrag: float
    kleur: str
    bijgewerkt_op: datetime = Field(default_factory=datetime.utcnow)


# Pydantic schemas
class AccountCreate(SQLModel):
    naam: str
    type: str
    saldo: float
    inleg: float
    kleur: str


class AccountUpdate(SQLModel):
    naam: Optional[str] = None
    type: Optional[str] = None
    saldo: Optional[float] = None
    inleg: Optional[float] = None
    kleur: Optional[str] = None


class SaldoHistorieCreate(SQLModel):
    datum: date
    saldo: float


class RendementCreate(SQLModel):
    jaar: int
    rendement_pct: Optional[float] = None
    rendement_abs: Optional[float] = None
    benchmark_pct: Optional[float] = None


class JaaropgaveCreate(SQLModel):
    jaar: int
    saldo_begin: float
    saldo_eind: float
    inleg: float
    heffingsvrij_vermogen: float = 57000.0


class SchuldCreate(SQLModel):
    naam: str
    type: str
    bedrag: float
    kleur: str


class SchuldUpdate(SQLModel):
    naam: Optional[str] = None
    type: Optional[str] = None
    bedrag: Optional[float] = None
    kleur: Optional[str] = None
