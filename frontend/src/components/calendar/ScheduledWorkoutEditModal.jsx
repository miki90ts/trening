import React from "react";
import Modal from "../common/Modal";
import ScheduleForm from "./ScheduleForm";

function ScheduledWorkoutEditModal({ isOpen, onClose, item, onSubmit }) {
  const handleSubmit = async (formData) => {
    await onSubmit(item.id, formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Izmeni zakazani trening">
      <ScheduleForm
        initialData={item}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

export default ScheduledWorkoutEditModal;
