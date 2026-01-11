import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Vehicle } from '../../../types/index';

interface AddVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => Promise<void>;
}

export const AddVehicleModal = ({ isOpen, onClose, onSave }: AddVehicleModalProps) => {
    const [name, setName] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [type, setType] = useState('Car');
    const [licensePlate, setLicensePlate] = useState('');
    const [mileage, setMileage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name || !make || !model) return;
        setIsSubmitting(true);
        try {
            await onSave({
                id: crypto.randomUUID(),
                name,
                make,
                model,
                year: parseInt(year) || new Date().getFullYear(),
                mileage: parseInt(mileage) || 0,
                type: type as 'Car' | 'Bike',
                licensePlate
            });
            onClose();
            // Reset form
            setName('');
            setMake('');
            setModel('');
            setYear('');
            setLicensePlate('');
            setMileage('');
        } catch (error) {
            console.error("Failed to save vehicle", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Vehicle">
            <div className="space-y-4">
                <Input
                    label="Vehicle Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Honda City"
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Make"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="e.g. Honda"
                    />
                    <Input
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. City"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Year"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="2023"
                    />
                    <Select
                        label="Type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="Car">Car</option>
                        <option value="Bike">Bike</option>
                    </Select>
                </div>
                <Input
                    label="License Plate (Optional)"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="MH-02-AB-1234"
                />
                <Input
                    label="Current Odometer (km)"
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="e.g. 15000"
                />
                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={!name || !make || !model}
                    >
                        Save Vehicle
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
