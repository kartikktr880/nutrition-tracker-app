import { useState } from 'react';
import { ExerciseFormTemplate } from '@/lib/validations/exerciseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface CreateFormTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: ExerciseFormTemplate) => void;
  exercises: Array<{ id: string; name: string }>;
}

export function CreateFormTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  exercises,
}: CreateFormTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [checklist, setChecklist] = useState<Array<{
    item: string;
    description: string;
    importance: 'critical' | 'important' | 'optional';
  }>>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [newTip, setNewTip] = useState('');
  const [newMistake, setNewMistake] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState({
    item: '',
    description: '',
    importance: 'important' as const,
  });

  const handleAddChecklistItem = () => {
    if (newChecklistItem.item && newChecklistItem.description) {
      setChecklist([...checklist, newChecklistItem]);
      setNewChecklistItem({
        item: '',
        description: '',
        importance: 'important',
      });
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleAddTip = () => {
    if (newTip) {
      setTips([...tips, newTip]);
      setNewTip('');
    }
  };

  const handleRemoveTip = (index: number) => {
    setTips(tips.filter((_, i) => i !== index));
  };

  const handleAddMistake = () => {
    if (newMistake) {
      setCommonMistakes([...commonMistakes, newMistake]);
      setNewMistake('');
    }
  };

  const handleRemoveMistake = (index: number) => {
    setCommonMistakes(commonMistakes.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const template: ExerciseFormTemplate = {
      name,
      description,
      exerciseId,
      checklist,
      tips,
      commonMistakes,
    };
    onSubmit(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Form Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Template description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Exercise</label>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Checklist Items</label>
            <div className="space-y-4">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.item}
                      onChange={(e) => {
                        const newChecklist = [...checklist];
                        newChecklist[index].item = e.target.value;
                        setChecklist(newChecklist);
                      }}
                      placeholder="Item name"
                    />
                    <Textarea
                      value={item.description}
                      onChange={(e) => {
                        const newChecklist = [...checklist];
                        newChecklist[index].description = e.target.value;
                        setChecklist(newChecklist);
                      }}
                      placeholder="Item description"
                    />
                    <Select
                      value={item.importance}
                      onValueChange={(value: 'critical' | 'important' | 'optional') => {
                        const newChecklist = [...checklist];
                        newChecklist[index].importance = value;
                        setChecklist(newChecklist);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select importance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChecklistItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-start space-x-4">
                <div className="flex-1 space-y-2">
                  <Input
                    value={newChecklistItem.item}
                    onChange={(e) =>
                      setNewChecklistItem({
                        ...newChecklistItem,
                        item: e.target.value,
                      })
                    }
                    placeholder="New item name"
                  />
                  <Textarea
                    value={newChecklistItem.description}
                    onChange={(e) =>
                      setNewChecklistItem({
                        ...newChecklistItem,
                        description: e.target.value,
                      })
                    }
                    placeholder="New item description"
                  />
                  <Select
                    value={newChecklistItem.importance}
                    onValueChange={(value: 'critical' | 'important' | 'optional') =>
                      setNewChecklistItem({
                        ...newChecklistItem,
                        importance: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select importance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddChecklistItem}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tips</label>
            <div className="space-y-4">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Input value={tip} readOnly />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTip(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-4">
                <Input
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  placeholder="New tip"
                />
                <Button variant="ghost" size="icon" onClick={handleAddTip}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Common Mistakes
            </label>
            <div className="space-y-4">
              {commonMistakes.map((mistake, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Input value={mistake} readOnly />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMistake(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-4">
                <Input
                  value={newMistake}
                  onChange={(e) => setNewMistake(e.target.value)}
                  placeholder="New common mistake"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddMistake}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create Template</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 