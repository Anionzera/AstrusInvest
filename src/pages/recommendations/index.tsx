import { Plus, PlusCircle, Sparkles } from "lucide-react";

        <PageHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Recomendações</h1>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/recommendations/new')} className="flex gap-2">
                <Plus className="h-4 w-4" />
                <span>Nova Recomendação</span>
              </Button>
            </div>
          </div>
        </PageHeader> 