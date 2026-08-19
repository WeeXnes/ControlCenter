<template>
  <div class="space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="material-symbols:notifications-active-rounded" size="22" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-base-content">Notification &amp; Alert Rules</h1>
            <p class="text-xs text-base-content/60 font-medium">
              Configure real-time Discord webhook alerts for node availability, service downtime, and hardware load thresholds.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="openCreateRuleModal"
          class="btn btn-primary btn-sm rounded-lg shadow-md hover:scale-[1.02] transition-all font-semibold gap-1.5 text-xs"
        >
          <Icon name="material-symbols:add-rounded" size="18" />
          Create Alert Rule
        </button>
      </div>
    </div>

    <!-- Global Discord Settings Banner -->
    <div class="p-5 rounded-2xl bg-base-200/50 border border-base-content/10 shadow-sm space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center flex-shrink-0 shadow-inner">
            <Icon name="material-symbols:webhook-rounded" size="22" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-base-content">Global Discord Webhook</h2>
              <span class="badge badge-xs font-mono font-bold" :class="settings.discord_enabled ? 'badge-success' : 'badge-ghost text-base-content/40'">
                {{ settings.discord_enabled ? 'ACTIVE' : 'DISABLED' }}
              </span>
            </div>
            <p class="text-[11px] text-base-content/60">
              Default dispatch target for all alert rules without a dedicated custom webhook.
            </p>
          </div>
        </div>

        <!-- Master Toggle -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-base-content/70">Master Notifications</span>
          <input 
            v-model="settings.discord_enabled" 
            type="checkbox" 
            class="toggle toggle-primary toggle-sm"
            @change="saveGlobalSettings"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-base-content/5">
        <div class="lg:col-span-8 space-y-1">
          <label class="text-[11px] font-bold uppercase tracking-wider text-base-content/60">Default Webhook URL</label>
          <div class="relative">
            <input
              v-model="settings.discord_webhook_url"
              :type="showWebhookUrl ? 'text' : 'password'"
              placeholder="https://discord.com/api/webhooks/..."
              class="input input-sm w-full rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs pr-9"
            />
            <button
              type="button"
              @click="showWebhookUrl = !showWebhookUrl"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
            >
              <Icon :name="showWebhookUrl ? 'material-symbols:visibility-off-rounded' : 'material-symbols:visibility-rounded'" size="15" />
            </button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-1">
          <label class="text-[11px] font-bold uppercase tracking-wider text-base-content/60">Default Cooldown</label>
          <div class="flex items-center gap-1.5">
            <input
              v-model.number="settings.cooldown_minutes"
              type="number"
              min="1"
              max="1440"
              class="input input-sm w-full rounded-lg bg-base-100 border-base-content/10 font-mono text-center text-xs"
            />
            <span class="text-[11px] text-base-content/50">min</span>
          </div>
        </div>

        <div class="lg:col-span-2 flex items-end gap-2">
          <button
            @click="testWebhook(settings.discord_webhook_url)"
            class="btn btn-outline btn-sm flex-1 rounded-lg text-xs font-semibold gap-1"
            :disabled="testingWebhook || !settings.discord_webhook_url"
          >
            <span v-if="testingWebhook" class="loading loading-spinner loading-xs"></span>
            <Icon v-else name="material-symbols:send-rounded" size="14" />
            Test
          </button>

          <button
            @click="saveGlobalSettings"
            class="btn btn-primary btn-sm flex-1 rounded-lg text-xs font-semibold gap-1 shadow"
            :disabled="savingSettings"
          >
            <span v-if="savingSettings" class="loading loading-spinner loading-xs"></span>
            <Icon v-else name="material-symbols:save-rounded" size="14" />
            Save
          </button>
        </div>
      </div>

      <!-- Feedback Messages -->
      <div v-if="globalMsg" class="alert py-2 rounded-lg text-xs" :class="globalMsgType === 'success' ? 'alert-success' : 'alert-error'">
        <span>{{ globalMsg }}</span>
      </div>
    </div>

    <!-- Filter & Controls Toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="join bg-base-200/60 p-0.5 rounded-lg border border-base-content/5 text-xs">
          <button 
            @click="filterType = 'all'" 
            class="btn btn-xs join-item"
            :class="filterType === 'all' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/70'"
          >
            All Rules ({{ rules.length }})
          </button>
          <button 
            @click="filterType = 'status'" 
            class="btn btn-xs join-item"
            :class="filterType === 'status' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/70'"
          >
            Availability ({{ rules.filter(r => r.triggerType === 'status').length }})
          </button>
          <button 
            @click="filterType = 'usage'" 
            class="btn btn-xs join-item"
            :class="filterType === 'usage' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/70'"
          >
            Telemetry ({{ rules.filter(r => r.triggerType === 'usage').length }})
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative flex-1 sm:w-64">
          <Icon name="material-symbols:search-rounded" size="16" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search rules..."
            class="input input-xs w-full pl-8 rounded-lg bg-base-200/60 border-base-content/10 text-xs"
          />
        </div>
      </div>
    </div>

    <!-- Alert Rules Grid -->
    <div v-if="filteredRules.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="rule in filteredRules"
        :key="rule.id"
        class="card bg-base-200/40 hover:bg-base-200/70 border rounded-2xl p-5 space-y-4 transition-all duration-200 shadow-sm"
        :class="rule.enabled ? 'border-base-content/10' : 'border-base-content/5 opacity-60'"
      >
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span 
                class="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                :class="rule.enabled ? (rule.triggerType === 'status' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-warning shadow-[0_0_8px_rgba(234,179,8,0.6)]') : 'bg-base-content/30'"
              ></span>
              <h3 class="font-bold text-sm text-base-content truncate" :title="rule.name">{{ rule.name }}</h3>
            </div>
            <p class="text-[11px] text-base-content/50 truncate pt-0.5">
              Created {{ new Date(rule.createdAt).toLocaleDateString() }}
            </p>
          </div>

          <!-- Quick Toggle -->
          <input 
            v-model="rule.enabled" 
            type="checkbox" 
            class="toggle toggle-primary toggle-xs"
            @change="toggleRuleState(rule)"
            title="Toggle Rule Active / Inactive"
          />
        </div>

        <!-- Target Scope Banner -->
        <div class="p-2.5 rounded-xl bg-base-100/80 border border-base-content/5 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-base-content/60 text-[10px] font-bold uppercase tracking-wider">
            <span>Target Scope</span>
            <span class="badge badge-xs font-mono font-semibold" :class="getTargetBadgeClass(rule.targetType)">
              {{ formatTargetType(rule.targetType) }}
            </span>
          </div>

          <div class="flex items-center gap-2 font-medium">
            <Icon :name="getTargetIcon(rule.targetType)" size="16" class="text-primary flex-shrink-0" />
            <span class="truncate font-semibold text-base-content/90">{{ getTargetDisplayName(rule) }}</span>
          </div>
        </div>

        <!-- Trigger Condition Details -->
        <div class="p-2.5 rounded-xl bg-base-100/80 border border-base-content/5 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-base-content/60 text-[10px] font-bold uppercase tracking-wider">
            <span>Trigger Condition</span>
            <span class="badge badge-xs font-mono font-semibold" :class="rule.triggerType === 'status' ? 'badge-info' : 'badge-warning'">
              {{ rule.triggerType === 'status' ? 'STATE CHANGE' : 'THRESHOLD' }}
            </span>
          </div>

          <!-- Status Condition -->
          <div v-if="rule.triggerType === 'status'" class="flex items-center gap-2 font-medium">
            <Icon 
              :name="rule.statusCondition === 'offline_only' ? 'material-symbols:cloud-off-rounded' : (rule.statusCondition === 'online_only' ? 'material-symbols:cloud-done-rounded' : 'material-symbols:sync-alt-rounded')" 
              size="16" 
              :class="rule.statusCondition === 'offline_only' ? 'text-error' : (rule.statusCondition === 'online_only' ? 'text-success' : 'text-primary')"
            />
            <span class="text-base-content/90">
              {{ formatStatusCondition(rule.statusCondition) }}
            </span>
          </div>

          <!-- Usage Threshold -->
          <div v-else class="flex items-center justify-between gap-2 font-medium">
            <div class="flex items-center gap-2">
              <Icon 
                :name="rule.metricType === 'cpu' ? 'material-symbols:memory-rounded' : (rule.metricType === 'ram' ? 'material-symbols:storage-rounded' : 'material-symbols:hard-drive-2-rounded')" 
                size="16" 
                class="text-warning"
              />
              <span class="uppercase font-bold text-[11px]">{{ rule.metricType }} Usage</span>
            </div>
            <span class="font-mono font-bold text-xs text-warning">&ge; {{ rule.thresholdPercent }}%</span>
          </div>
        </div>

        <!-- Card Footer Info & Actions -->
        <div class="pt-2 border-t border-base-content/5 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-[11px] text-base-content/50">
            <span class="flex items-center gap-1 font-mono">
              <Icon name="material-symbols:timer-outline-rounded" size="13" />
              {{ rule.cooldownMinutes || settings.cooldown_minutes || 5 }}m
            </span>
            <span v-if="rule.customWebhookUrl" class="badge badge-ghost badge-xs gap-1 font-mono">
              <Icon name="material-symbols:webhook-rounded" size="10" />
              Custom Webhook
            </span>
          </div>

          <div class="flex items-center gap-1">
            <button 
              @click="editRule(rule)" 
              class="btn btn-ghost btn-xs text-base-content/70 hover:text-primary rounded-md p-1"
              title="Edit Rule"
            >
              <Icon name="material-symbols:edit-outline-rounded" size="15" />
            </button>

            <button 
              @click="deleteRule(rule.id)" 
              class="btn btn-ghost btn-xs text-base-content/70 hover:text-error rounded-md p-1"
              title="Delete Rule"
            >
              <Icon name="material-symbols:delete-outline-rounded" size="15" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Blank State -->
    <div 
      v-else-if="!loading"
      class="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-base-200/30 border border-base-content/10 space-y-5"
    >
      <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon name="material-symbols:notification-add-rounded" size="28" />
      </div>

      <div class="space-y-1.5 max-w-md">
        <h3 class="text-base font-bold">No Alert Rules Configured</h3>
        <p class="text-xs text-base-content/60 font-medium leading-relaxed">
          Create rules to monitor specific machines, all nodes, or individual ports and dispatch Discord notifications when downtime occurs or hardware load exceeds limits.
        </p>
      </div>

      <!-- Quick Template Starters -->
      <div class="flex items-center gap-2 flex-wrap justify-center pt-2">
        <button 
          @click="addTemplateRule('node_offline')" 
          class="btn btn-sm btn-outline rounded-xl text-xs gap-1.5 font-semibold"
        >
          <Icon name="material-symbols:cloud-off-rounded" size="15" class="text-error" />
          + All Nodes Offline Alert
        </button>

        <button 
          @click="addTemplateRule('high_cpu')" 
          class="btn btn-sm btn-outline rounded-xl text-xs gap-1.5 font-semibold"
        >
          <Icon name="material-symbols:memory-rounded" size="15" class="text-warning" />
          + High CPU Usage (>80%)
        </button>

        <button 
          @click="addTemplateRule('service_down')" 
          class="btn btn-sm btn-outline rounded-xl text-xs gap-1.5 font-semibold"
        >
          <Icon name="material-symbols:dns-rounded" size="15" class="text-info" />
          + All Services Downtime
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-else class="flex justify-center p-16">
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>

    <!-- Create / Edit Rule Modal -->
    <div v-if="modalOpen" class="modal modal-open backdrop-blur-md z-50">
      <div class="modal-box bg-base-200 border border-base-content/10 rounded-2xl p-6 space-y-5 max-w-xl">
        <div class="flex items-center justify-between pb-2 border-b border-base-content/10">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon :name="editingRuleId ? 'material-symbols:edit-rounded' : 'material-symbols:add-alert-rounded'" size="18" />
            </div>
            <h3 class="text-base font-bold">
              {{ editingRuleId ? 'Edit Alert Rule' : 'Create Alert Rule' }}
            </h3>
          </div>
          <button @click="modalOpen = false" class="btn btn-ghost btn-xs btn-circle">
            <Icon name="material-symbols:close-rounded" size="16" />
          </button>
        </div>

        <form @submit.prevent="saveRule" class="space-y-4 text-xs">
          <!-- Rule Name -->
          <div class="form-control">
            <label class="label py-0.5">
              <span class="label-text font-bold text-base-content/80 text-xs">Rule Name</span>
            </label>
            <input
              v-model="ruleForm.name"
              type="text"
              required
              placeholder="e.g. Production Nodes Downtime Alert"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-medium"
            />
          </div>

          <!-- Target Scope Selection -->
          <div class="space-y-2">
            <label class="label py-0.5">
              <span class="label-text font-bold text-base-content/80 text-xs">Target Scope</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="ruleForm.targetType = 'all_machines'; ruleForm.targetId = undefined"
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all"
                :class="ruleForm.targetType === 'all_machines' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-base-content/10 bg-base-100 text-base-content/70 hover:bg-base-100/80'"
              >
                <Icon name="material-symbols:dns-outline-rounded" size="16" />
                <span>All Machines</span>
              </button>

              <button
                type="button"
                @click="ruleForm.targetType = 'machine'"
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all"
                :class="ruleForm.targetType === 'machine' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-base-content/10 bg-base-100 text-base-content/70 hover:bg-base-100/80'"
              >
                <Icon name="material-symbols:computer-outline-rounded" size="16" />
                <span>Specific Machine</span>
              </button>

              <button
                type="button"
                @click="ruleForm.targetType = 'all_services'; ruleForm.targetId = undefined"
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all"
                :class="ruleForm.targetType === 'all_services' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-base-content/10 bg-base-100 text-base-content/70 hover:bg-base-100/80'"
              >
                <Icon name="material-symbols:hub-outline-rounded" size="16" />
                <span>All Services &amp; Ports</span>
              </button>

              <button
                type="button"
                @click="ruleForm.targetType = 'service'"
                class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all"
                :class="ruleForm.targetType === 'service' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-base-content/10 bg-base-100 text-base-content/70 hover:bg-base-100/80'"
              >
                <Icon name="material-symbols:lan-outline-rounded" size="16" />
                <span>Specific Service</span>
              </button>
            </div>

            <!-- Specific Machine Dropdown -->
            <div v-if="ruleForm.targetType === 'machine'" class="pt-1">
              <select 
                v-model="ruleForm.targetId" 
                required
                class="select select-sm w-full rounded-lg bg-base-100 border-base-content/10 font-medium"
              >
                <option value="" disabled>Select a Machine</option>
                <option v-for="m in machines" :key="m.id" :value="m.id">
                  {{ m.name }} ({{ m.ip }})
                </option>
              </select>
            </div>

            <!-- Specific Service Dropdown -->
            <div v-if="ruleForm.targetType === 'service'" class="pt-1">
              <select 
                v-model="ruleForm.targetId" 
                required
                class="select select-sm w-full rounded-lg bg-base-100 border-base-content/10 font-medium"
              >
                <option value="" disabled>Select a Monitored Service</option>
                <option v-for="s in flatServices" :key="s.id" :value="s.id">
                  {{ s.name }} (Port {{ s.port }}) on {{ s.nodeName }}
                </option>
              </select>
            </div>
          </div>

          <!-- Trigger Type Selection -->
          <div class="space-y-2">
            <label class="label py-0.5">
              <span class="label-text font-bold text-base-content/80 text-xs">Trigger Type</span>
            </label>

            <div class="join w-full bg-base-100 p-1 rounded-xl border border-base-content/10">
              <button
                type="button"
                @click="ruleForm.triggerType = 'status'"
                class="btn btn-sm join-item flex-1 font-semibold text-xs"
                :class="ruleForm.triggerType === 'status' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
              >
                <Icon name="material-symbols:cloud-sync-rounded" size="16" />
                Online / Offline Status
              </button>

              <button
                type="button"
                @click="ruleForm.triggerType = 'usage'"
                class="btn btn-sm join-item flex-1 font-semibold text-xs"
                :class="ruleForm.triggerType === 'usage' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
                :disabled="ruleForm.targetType === 'all_services' || ruleForm.targetType === 'service'"
              >
                <Icon name="material-symbols:monitoring-rounded" size="16" />
                Resource Telemetry
              </button>
            </div>
          </div>

          <!-- Status Trigger Conditions -->
          <div v-if="ruleForm.triggerType === 'status'" class="p-3.5 rounded-xl bg-base-100 border border-base-content/10 space-y-2.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-base-content/70">Alert Event Conditions</span>
            
            <div class="space-y-1.5">
              <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200/50">
                <input v-model="ruleForm.statusCondition" type="radio" value="both" class="radio radio-primary radio-xs" />
                <span>Alert on both <strong>Downtime (Offline)</strong> and <strong>Recovery (Online)</strong></span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200/50">
                <input v-model="ruleForm.statusCondition" type="radio" value="offline_only" class="radio radio-error radio-xs" />
                <span>Alert only on <strong>Downtime (Going Offline)</strong></span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-200/50">
                <input v-model="ruleForm.statusCondition" type="radio" value="online_only" class="radio radio-success radio-xs" />
                <span>Alert only on <strong>Recovery (Coming Online)</strong></span>
              </label>
            </div>
          </div>

          <!-- Usage Telemetry Conditions -->
          <div v-if="ruleForm.triggerType === 'usage'" class="p-3.5 rounded-xl bg-base-100 border border-base-content/10 space-y-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-base-content/70">Resource &amp; Threshold</span>

            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="ruleForm.metricType = 'cpu'"
                class="btn btn-sm text-xs"
                :class="ruleForm.metricType === 'cpu' ? 'btn-primary' : 'btn-outline border-base-content/10'"
              >
                CPU Load
              </button>
              <button
                type="button"
                @click="ruleForm.metricType = 'ram'"
                class="btn btn-sm text-xs"
                :class="ruleForm.metricType === 'ram' ? 'btn-secondary' : 'btn-outline border-base-content/10'"
              >
                RAM Usage
              </button>
              <button
                type="button"
                @click="ruleForm.metricType = 'disk'"
                class="btn btn-sm text-xs"
                :class="ruleForm.metricType === 'disk' ? 'btn-accent' : 'btn-outline border-base-content/10'"
              >
                Disk Storage
              </button>
            </div>

            <div class="space-y-1 pt-1">
              <div class="flex items-center justify-between font-medium">
                <span>Trigger when {{ ruleForm.metricType?.toUpperCase() }} exceeds:</span>
                <span class="font-mono font-bold text-primary">{{ ruleForm.thresholdPercent }}%</span>
              </div>
              <input
                v-model.number="ruleForm.thresholdPercent"
                type="range"
                min="30"
                max="99"
                class="range range-primary range-xs"
              />
            </div>
          </div>

          <!-- Webhook Override & Cooldown -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2 form-control">
              <label class="label py-0.5">
                <span class="label-text font-bold text-base-content/80 text-xs">Custom Webhook (Optional)</span>
              </label>
              <input
                v-model="ruleForm.customWebhookUrl"
                type="text"
                placeholder="Leave blank for Global Webhook"
                class="input input-sm rounded-lg bg-base-100 border-base-content/10 font-mono text-xs"
              />
            </div>

            <div class="form-control">
              <label class="label py-0.5">
                <span class="label-text font-bold text-base-content/80 text-xs">Cooldown (Min)</span>
              </label>
              <input
                v-model.number="ruleForm.cooldownMinutes"
                type="number"
                min="1"
                max="1440"
                placeholder="5"
                class="input input-sm rounded-lg bg-base-100 border-base-content/10 font-mono text-center text-xs"
              />
            </div>
          </div>

          <!-- Enabled Toggle -->
          <label class="flex items-center gap-2 cursor-pointer pt-1">
            <input v-model="ruleForm.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
            <span class="font-bold text-base-content/80 text-xs">Enable this alert rule immediately</span>
          </label>

          <!-- Modal Action Buttons -->
          <div class="flex justify-end gap-2 pt-3 border-t border-base-content/10">
            <button
              type="button"
              @click="modalOpen = false"
              class="btn btn-ghost btn-sm rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-sm rounded-lg shadow font-semibold"
              :disabled="savingRule"
            >
              <span v-if="savingRule" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:check-circle-outline-rounded" size="16" />
              {{ editingRuleId ? 'Save Changes' : 'Create Rule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

const loading = ref(true)
const savingSettings = ref(false)
const testingWebhook = ref(false)
const savingRule = ref(false)
const showWebhookUrl = ref(false)

const globalMsg = ref('')
const globalMsgType = ref<'success' | 'error'>('success')

const filterType = ref<'all' | 'status' | 'usage'>('all')
const searchQuery = ref('')

const settings = reactive({
  discord_webhook_url: '',
  discord_enabled: false,
  cooldown_minutes: 5,
  rules: [] as any[]
})

const rules = ref<any[]>([])
const machines = ref<any[]>([])
const nodeServices = ref<Record<string, any[]>>({})

const modalOpen = ref(false)
const editingRuleId = ref<string | null>(null)

const ruleForm = reactive({
  id: '',
  name: '',
  enabled: true,
  targetType: 'all_machines' as 'all_machines' | 'machine' | 'all_services' | 'service',
  targetId: undefined as string | undefined,
  targetName: undefined as string | undefined,
  triggerType: 'status' as 'status' | 'usage',
  statusCondition: 'both' as 'both' | 'offline_only' | 'online_only',
  metricType: 'cpu' as 'cpu' | 'ram' | 'disk',
  thresholdPercent: 80,
  customWebhookUrl: '',
  cooldownMinutes: 5
})

const flatServices = computed(() => {
  const list: any[] = []
  for (const [nodeId, srvs] of Object.entries(nodeServices.value || {})) {
    const machine = machines.value.find(m => m.id === nodeId)
    const nodeName = machine?.name || `Node ${nodeId.substring(0, 8)}`
    if (Array.isArray(srvs)) {
      for (const s of srvs) {
        list.push({
          ...s,
          nodeId,
          nodeName
        })
      }
    }
  }
  return list
})

const filteredRules = computed(() => {
  return rules.value.filter(r => {
    if (filterType.value !== 'all' && r.triggerType !== filterType.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchName = r.name?.toLowerCase().includes(q)
      const matchTarget = getTargetDisplayName(r)?.toLowerCase().includes(q)
      return matchName || matchTarget
    }
    return true
  })
})

const fetchAll = async () => {
  loading.value = true
  try {
    const [notifRes, machRes, srvRes] = await Promise.all([
      $fetch<any>('/api/notifications/settings'),
      $fetch<any[]>('/api/machines').catch(() => []),
      $fetch<any>('/api/infrastructure/services').catch(() => ({}))
    ])

    if (notifRes) {
      settings.discord_webhook_url = notifRes.discord_webhook_url || ''
      settings.discord_enabled = notifRes.discord_enabled ?? false
      settings.cooldown_minutes = notifRes.cooldown_minutes ?? 5
      rules.value = notifRes.rules || []
    }

    machines.value = machRes || []
    nodeServices.value = srvRes?.nodeServices || {}
  } catch (err: any) {
    console.error('Failed to load notification settings:', err)
  } finally {
    loading.value = false
  }
}

const saveGlobalSettings = async () => {
  savingSettings.value = true
  globalMsg.value = ''
  try {
    await $fetch('/api/notifications/settings', {
      method: 'PUT',
      body: {
        discord_webhook_url: settings.discord_webhook_url,
        discord_enabled: settings.discord_enabled,
        cooldown_minutes: settings.cooldown_minutes,
        rules: rules.value
      }
    })
    globalMsgType.value = 'success'
    globalMsg.value = 'Global notification settings updated successfully!'
    setTimeout(() => { globalMsg.value = '' }, 3000)
  } catch (err: any) {
    globalMsgType.value = 'error'
    globalMsg.value = err.data?.statusMessage || err.message || 'Failed to save global settings.'
  } finally {
    savingSettings.value = false
  }
}

const testWebhook = async (url: string) => {
  if (!url) return
  testingWebhook.value = true
  globalMsg.value = ''
  try {
    await $fetch('/api/notifications/test-webhook', {
      method: 'POST',
      body: { webhookUrl: url }
    })
    globalMsgType.value = 'success'
    globalMsg.value = 'Discord test message dispatched successfully! Check your Discord channel.'
    setTimeout(() => { globalMsg.value = '' }, 4000)
  } catch (err: any) {
    globalMsgType.value = 'error'
    globalMsg.value = err.data?.statusMessage || err.message || 'Failed to send test webhook.'
  } finally {
    testingWebhook.value = false
  }
}

const openCreateRuleModal = () => {
  editingRuleId.value = null
  ruleForm.id = ''
  ruleForm.name = ''
  ruleForm.enabled = true
  ruleForm.targetType = 'all_machines'
  ruleForm.targetId = undefined
  ruleForm.targetName = undefined
  ruleForm.triggerType = 'status'
  ruleForm.statusCondition = 'both'
  ruleForm.metricType = 'cpu'
  ruleForm.thresholdPercent = 80
  ruleForm.customWebhookUrl = ''
  ruleForm.cooldownMinutes = 5
  modalOpen.value = true
}

const editRule = (rule: any) => {
  editingRuleId.value = rule.id
  ruleForm.id = rule.id
  ruleForm.name = rule.name
  ruleForm.enabled = rule.enabled ?? true
  ruleForm.targetType = rule.targetType || 'all_machines'
  ruleForm.targetId = rule.targetId
  ruleForm.targetName = rule.targetName
  ruleForm.triggerType = rule.triggerType || 'status'
  ruleForm.statusCondition = rule.statusCondition || 'both'
  ruleForm.metricType = rule.metricType || 'cpu'
  ruleForm.thresholdPercent = rule.thresholdPercent ?? 80
  ruleForm.customWebhookUrl = rule.customWebhookUrl || ''
  ruleForm.cooldownMinutes = rule.cooldownMinutes ?? 5
  modalOpen.value = true
}

const saveRule = async () => {
  savingRule.value = true
  try {
    // Resolve target display name
    let targetDisplayName = ''
    if (ruleForm.targetType === 'machine' && ruleForm.targetId) {
      const found = machines.value.find(m => m.id === ruleForm.targetId)
      targetDisplayName = found ? `${found.name} (${found.ip})` : ruleForm.targetId
    } else if (ruleForm.targetType === 'service' && ruleForm.targetId) {
      const found = flatServices.value.find(s => s.id === ruleForm.targetId)
      targetDisplayName = found ? `${found.name} (Port ${found.port})` : ruleForm.targetId
    }

    const payload = {
      id: ruleForm.id || undefined,
      name: ruleForm.name,
      enabled: ruleForm.enabled,
      targetType: ruleForm.targetType,
      targetId: ruleForm.targetId || undefined,
      targetName: targetDisplayName || undefined,
      triggerType: ruleForm.triggerType,
      statusCondition: ruleForm.statusCondition,
      metricType: ruleForm.metricType,
      thresholdPercent: Number(ruleForm.thresholdPercent),
      customWebhookUrl: ruleForm.customWebhookUrl || undefined,
      cooldownMinutes: Number(ruleForm.cooldownMinutes || 5)
    }

    const res = await $fetch<any>('/api/notifications/rules', {
      method: 'POST',
      body: payload
    })

    rules.value = res.rules || []
    modalOpen.value = false
  } catch (err: any) {
    alert(`Failed to save alert rule: ${err.message}`)
  } finally {
    savingRule.value = false
  }
}

const toggleRuleState = async (rule: any) => {
  try {
    const res = await $fetch<any>('/api/notifications/rules', {
      method: 'POST',
      body: {
        ...rule,
        enabled: rule.enabled
      }
    })
    rules.value = res.rules || []
  } catch (err: any) {
    rule.enabled = !rule.enabled
    alert(`Failed to update rule: ${err.message}`)
  }
}

const deleteRule = async (id: string) => {
  if (!confirm('Are you sure you want to delete this alert rule?')) return
  try {
    const res = await $fetch<any>(`/api/notifications/rules?id=${id}`, {
      method: 'DELETE'
    })
    rules.value = res.rules || []
  } catch (err: any) {
    alert(`Failed to delete rule: ${err.message}`)
  }
}

const addTemplateRule = (type: 'node_offline' | 'high_cpu' | 'service_down') => {
  openCreateRuleModal()
  if (type === 'node_offline') {
    ruleForm.name = 'All Nodes Availability Alert'
    ruleForm.targetType = 'all_machines'
    ruleForm.triggerType = 'status'
    ruleForm.statusCondition = 'both'
  } else if (type === 'high_cpu') {
    ruleForm.name = 'High CPU Load Alert (>80%)'
    ruleForm.targetType = 'all_machines'
    ruleForm.triggerType = 'usage'
    ruleForm.metricType = 'cpu'
    ruleForm.thresholdPercent = 80
  } else if (type === 'service_down') {
    ruleForm.name = 'Monitored Port Downtime Alert'
    ruleForm.targetType = 'all_services'
    ruleForm.triggerType = 'status'
    ruleForm.statusCondition = 'offline_only'
  }
}

// Helper Formatters
const formatTargetType = (type: string) => {
  switch (type) {
    case 'all_machines': return 'All Machines'
    case 'machine': return 'Specific Machine'
    case 'all_services': return 'All Services'
    case 'service': return 'Specific Service'
    default: return type
  }
}

const getTargetBadgeClass = (type: string) => {
  switch (type) {
    case 'all_machines': return 'badge-primary'
    case 'machine': return 'badge-secondary'
    case 'all_services': return 'badge-accent'
    case 'service': return 'badge-info'
    default: return 'badge-ghost'
  }
}

const getTargetIcon = (type: string) => {
  switch (type) {
    case 'all_machines': return 'material-symbols:dns-outline-rounded'
    case 'machine': return 'material-symbols:computer-outline-rounded'
    case 'all_services': return 'material-symbols:hub-outline-rounded'
    case 'service': return 'material-symbols:lan-outline-rounded'
    default: return 'material-symbols:devices-outline-rounded'
  }
}

const getTargetDisplayName = (rule: any) => {
  if (rule.targetType === 'all_machines') return 'All Connected Machines'
  if (rule.targetType === 'all_services') return 'All Monitored Ports & Services'
  if (rule.targetType === 'machine') {
    const found = machines.value.find(m => m.id === rule.targetId)
    return found ? `${found.name} (${found.ip})` : (rule.targetName || `Machine ID: ${rule.targetId}`)
  }
  if (rule.targetType === 'service') {
    const found = flatServices.value.find(s => s.id === rule.targetId)
    return found ? `${found.name} (${found.port}/${found.protocol || 'TCP'}) on ${found.nodeName}` : (rule.targetName || `Service ID: ${rule.targetId}`)
  }
  return 'Global Scope'
}

const formatStatusCondition = (condition?: string) => {
  switch (condition) {
    case 'offline_only': return 'Triggers on Downtime (Offline)'
    case 'online_only': return 'Triggers on Restored (Online)'
    case 'both':
    default:
      return 'Triggers on Offline & Restored'
  }
}

onMounted(() => {
  fetchAll()
})
</script>
