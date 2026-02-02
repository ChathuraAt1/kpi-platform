<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\MonthlyEvaluation;

class EvaluationPublished extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public MonthlyEvaluation $evaluation;

    public function __construct(MonthlyEvaluation $evaluation)
    {
        $this->evaluation = $evaluation;
        $this->onQueue('mail');
    }

    public function build()
    {
        $userName = $this->evaluation->user->name ?? 'User';
        $subject = "Your monthly evaluation for {$this->evaluation->month}/{$this->evaluation->year} has been published";

        return $this->subject($subject)
            ->text('emails.evaluation_published_plain', ['evaluation' => $this->evaluation, 'userName' => $userName]);
    }
}
