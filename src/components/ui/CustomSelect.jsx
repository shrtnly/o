import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CustomSelect.module.css';

const CustomSelect = ({ value, onChange, options, placeholder, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue, id: '' } });
        setIsOpen(false);
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={value ? styles.value : styles.placeholder}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`${styles.icon} ${isOpen ? styles.iconRotate : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        className={styles.optionsList}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        role="listbox"
                    >
                        {options.map((option) => (
                            <li
                                key={option.value}
                                className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
                                onClick={() => handleSelect(option.value)}
                                role="option"
                                aria-selected={value === option.value}
                            >
                                {option.label}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
            {required && !value && <input tabIndex={-1} required style={{ opacity: 0, height: 0, width: 0, position: 'absolute' }} value="" onChange={() => { }} />}
        </div>
    );
};

export default CustomSelect;
