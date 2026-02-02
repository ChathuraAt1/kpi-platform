Hello {{ $userName }},

Your monthly evaluation for {{ $evaluation->month }}/{{ $evaluation->year }} has been published.

Final score: {{ $evaluation->score ?? 'N/A' }}

Breakdown:
@if(is_array($evaluation->breakdown))
@foreach($evaluation->breakdown as $cat)
- {{ $cat['category_name'] ?? ($cat['category'] ?? 'Category') }}: score={{ $cat['supervisor_score'] ?? $cat['llm_score'] ?? $cat['rule_score'] ?? 'N/A' }}
@endforeach
@endif

You can view details in the dashboard.

Regards,
KPI Platform