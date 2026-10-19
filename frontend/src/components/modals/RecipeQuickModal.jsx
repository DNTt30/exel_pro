import Modal from './Modal';
import KnowledgeLibrary from '../handbook/KnowledgeLibrary';

export default function RecipeQuickModal({ isOpen, onClose }) {
  return <Modal title="Công thức pha chế / chế biến" isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
    {isOpen && <KnowledgeLibrary recipesOnly />}
  </Modal>;
}
