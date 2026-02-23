import React, { useState } from "react";
import Modal from "./Modal";
import { sendContactMessage } from "../../services/api";
import { toast } from "react-toastify";
import { FiSend } from "react-icons/fi";

const TYPE_OPTIONS = [
  { value: "bug", label: "🐛 Bug — prijava greške" },
  { value: "predlog", label: "💡 Predlog — predlog za poboljšanje" },
  { value: "pitanje", label: "❓ Pitanje — potrebna pomoć" },
];

function ContactModal({ isOpen, onClose }) {
  const [type, setType] = useState("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim() || subject.trim().length < 3) {
      toast.error("Naslov mora imati najmanje 3 karaktera.");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      toast.error("Poruka mora imati najmanje 10 karaktera.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendContactMessage({
        type,
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success(res.message || "Poruka uspešno poslata!");
      setType("bug");
      setSubject("");
      setMessage("");
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          "Greška pri slanju poruke. Pokušajte ponovo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kontakt podrška">
      <form onSubmit={handleSubmit} className="contact-form">
        <p className="contact-form-desc">
          Imate problem, predlog ili pitanje? Pošaljite nam poruku i
          odgovorićemo vam putem emaila.
        </p>

        <div className="form-group">
          <label htmlFor="contact-type">Tip poruke</label>
          <select
            id="contact-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={loading}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="contact-subject">Naslov</label>
          <input
            id="contact-subject"
            type="text"
            placeholder="Ukratko opišite temu..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact-message">Poruka</label>
          <textarea
            id="contact-message"
            placeholder="Detaljno opišite problem, predlog ili pitanje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            rows={5}
            maxLength={2000}
          />
          <span className="contact-char-count">{message.length}/2000</span>
        </div>

        <div className="contact-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Otkaži
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !subject.trim() || !message.trim()}
          >
            {loading ? (
              "Slanje..."
            ) : (
              <>
                <FiSend style={{ marginRight: 6 }} />
                Pošalji
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ContactModal;
