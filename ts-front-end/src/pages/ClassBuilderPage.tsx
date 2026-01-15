import { motion } from "framer-motion";


const ClassBuilderPage: React.FC = () => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>

        </motion.div>
    );
}

export default ClassBuilderPage;