# عقود البيانات

## مفاتيح localStorage

### `qa_app_setup`
```json
{
  "teacherName": "string",
  "schoolName": "string",
  "competitionName": "string",
  "selectedClasses": ["string"],
  "studentGender": "boys|girls"
}
```

### `qa_app_students`
```json
{
  "className": ["student1", "student2", "..."]
}
```

### `qa_app_questions`
```json
{
  "subjectId": {
    "unitId": [
      {
        "id": "string",
        "text": "string",
        "choices": ["string", "string", "string", "string"],
        "correctIndex": 0
      }
    ]
  }
}
```

### `qa_app_active_quiz_session`
```json
{
  "timestamp": "ISO string",
  "className": "string",
  "subjectId": "string",
  "unitId": "string",
  "settings": {
    "questionCount": 10,
    "maxAttempts": 3,
    "shuffleAnswers": true,
    "timerSeconds": 0
  },
  "students": [
    {
      "name": "string",
      "points": 0,
      "correct": 0,
      "attempts": 0,
      "absent": false
    }
  ],
  "currentQuestionIndex": 0,
  "usedQuestionIds": ["string"]
}
```

### `qa_sound_enabled`
```json
true | false
```

### `qa_app_font_scale`
```json
0 | 1 | 2
```

### `qa_app_sample_questions_injected`
```json
true
```

## هيكل بيانات المواد (data-subjects.js)

```js
{
  id: "arabic",
  name: "لغتي",
  icon: "📖"
}
```

## هيكل بيانات الوحدات (data-units.js)

```js
{
  id: "unit1",
  subjectId: "arabic",
  name: "أسرتي",
  questions: [ /* مصفوفة أسئلة */ ]
}
```

## ملاحظة مهمة

- `correctIndex` = رقم الإجابة الصحيحة من 0 إلى 3
- الأسئلة النموذجية تُحقن تلقائياً عند أول تشغيل عبر `qa_app_sample_questions_injected`
- حذف هذا المفتاح يُعيد حقن الأسئلة النموذجية
