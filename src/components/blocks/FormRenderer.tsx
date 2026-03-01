import type { FormBlock } from '../../types';

interface Props {
  block: FormBlock;
}

export default function FormRenderer({ block }: Props) {
  const { fields, submitText, bgColor } = block.props;

  return (
    <div className="py-4 px-6 rounded-xl my-2" style={{ backgroundColor: bgColor }}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-md mx-auto">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                placeholder={field.placeholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y min-h-[80px]"
                required={field.required}
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required={field.required}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {submitText}
        </button>
      </form>
    </div>
  );
}
