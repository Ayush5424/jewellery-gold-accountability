package com.coimbatore.jewellery.support;

import com.coimbatore.jewellery.domain.entity.GoldLedgerEntry;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.LossAlert;
import com.coimbatore.jewellery.domain.entity.User;
import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.repository.*;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

public class InMemoryRepositories {

    public static class InMemoryKarigarRepository implements KarigarRepository {
        public final Map<Long, Karigar> store = new ConcurrentHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override public <S extends Karigar> S save(S entity) {
            if (entity.getId() == null) entity.setId(seq.getAndIncrement());
            store.put(entity.getId(), entity);
            return entity;
        }
        @Override public Optional<Karigar> findById(Long id) { return Optional.ofNullable(store.get(id)); }
        @Override public Optional<Karigar> findByKarigarCode(String code) {
            return store.values().stream().filter(k -> k.getKarigarCode().equals(code)).findFirst();
        }
        @Override public Optional<Karigar> findByUsername(String username) {
            return store.values().stream().filter(k -> username.equals(k.getUsername())).findFirst();
        }
        @Override public List<Karigar> findAllByActiveTrueOrderByNameAsc() {
            return store.values().stream().filter(Karigar::isActive).sorted(Comparator.comparing(Karigar::getName)).toList();
        }
        @Override public List<Karigar> findAll() { return new ArrayList<>(store.values()); }
        @Override public void deleteAll() { store.clear(); }
        @Override public void flush() {}
        @Override public <S extends Karigar> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends Karigar> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<Karigar> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public Karigar getOne(Long aLong) { return null; }
        @Override public Karigar getById(Long aLong) { return null; }
        @Override public Karigar getReferenceById(Long aLong) { return null; }
        @Override public <S extends Karigar> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Karigar> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends Karigar> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends Karigar> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Karigar> long count(Example<S> example) { return 0; }
        @Override public <S extends Karigar> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Karigar, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends Karigar> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(Long aLong) { return store.containsKey(aLong); }
        @Override public List<Karigar> findAllById(Iterable<Long> longs) { return null; }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(Long aLong) { store.remove(aLong); }
        @Override public void delete(Karigar entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends Karigar> entities) {}
        @Override public List<Karigar> findAll(Sort sort) { return null; }
        @Override public Page<Karigar> findAll(Pageable pageable) { return null; }
    }

    public static class InMemoryUserRepository implements UserRepository {
        public final Map<String, User> store = new ConcurrentHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override public <S extends User> S save(S entity) {
            if (entity.getId() == null) entity.setId(seq.getAndIncrement());
            store.put(entity.getUsername(), entity);
            return entity;
        }
        @Override public Optional<User> findByUsername(String username) { return Optional.ofNullable(store.get(username)); }
        @Override public boolean existsByUsername(String username) { return store.containsKey(username); }
        @Override public Optional<User> findById(Long id) {
            return store.values().stream().filter(u -> u.getId().equals(id)).findFirst();
        }
        @Override public void flush() {}
        @Override public <S extends User> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends User> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<User> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public User getOne(Long aLong) { return null; }
        @Override public User getById(Long aLong) { return null; }
        @Override public User getReferenceById(Long aLong) { return null; }
        @Override public <S extends User> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends User> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends User> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends User> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends User> long count(Example<S> example) { return 0; }
        @Override public <S extends User> boolean exists(Example<S> example) { return false; }
        @Override public <S extends User, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends User> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public List<User> findAll() { return new ArrayList<>(store.values()); }
        @Override public List<User> findAllById(Iterable<Long> longs) { return null; }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(Long aLong) {}
        @Override public void delete(User entity) { store.remove(entity.getUsername()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends User> entities) {}
        @Override public void deleteAll() { store.clear(); }
        @Override public List<User> findAll(Sort sort) { return null; }
        @Override public Page<User> findAll(Pageable pageable) { return null; }
        @Override public boolean existsById(Long aLong) { return false; }
    }

    public static class InMemoryJobOrderRepository implements JobOrderRepository {
        public final Map<Long, JobOrder> store = new ConcurrentHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override public <S extends JobOrder> S save(S entity) {
            if (entity.getId() == null) entity.setId(seq.getAndIncrement());
            store.put(entity.getId(), entity);
            return entity;
        }
        @Override public Optional<JobOrder> findById(Long id) { return Optional.ofNullable(store.get(id)); }
        @Override public Optional<JobOrder> findByJobCode(String jobCode) {
            return store.values().stream().filter(j -> j.getJobCode().equals(jobCode)).findFirst();
        }
        @Override public List<JobOrder> findByKarigarIdOrderByCreatedAtDesc(Long karigarId) {
            return store.values().stream().filter(j -> j.getKarigar().getId().equals(karigarId)).toList();
        }
        @Override public List<JobOrder> findByStatusOrderByCreatedAtDesc(JobStatus status) {
            return store.values().stream().filter(j -> j.getStatus() == status).toList();
        }
        @Override public List<JobOrder> findReconciledJobsByKarigar(Long karigarId) {
            return store.values().stream().filter(j -> j.getKarigar().getId().equals(karigarId) && j.getStatus() == JobStatus.RECONCILED).toList();
        }
        @Override public List<JobOrder> findAll() { return new ArrayList<>(store.values()); }
        @Override public void deleteAll() { store.clear(); }
        @Override public void flush() {}
        @Override public <S extends JobOrder> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends JobOrder> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<JobOrder> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public JobOrder getOne(Long aLong) { return null; }
        @Override public JobOrder getById(Long aLong) { return null; }
        @Override public JobOrder getReferenceById(Long aLong) { return null; }
        @Override public <S extends JobOrder> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends JobOrder> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends JobOrder> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends JobOrder> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends JobOrder> long count(Example<S> example) { return 0; }
        @Override public <S extends JobOrder> boolean exists(Example<S> example) { return false; }
        @Override public <S extends JobOrder, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends JobOrder> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(Long aLong) { return store.containsKey(aLong); }
        @Override public List<JobOrder> findAllById(Iterable<Long> longs) { return null; }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(Long aLong) { store.remove(aLong); }
        @Override public void delete(JobOrder entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends JobOrder> entities) {}
        @Override public List<JobOrder> findAll(Sort sort) { return null; }
        @Override public Page<JobOrder> findAll(Pageable pageable) { return null; }
    }

    public static class InMemoryGoldLedgerEntryRepository implements GoldLedgerEntryRepository {
        public final Map<Long, GoldLedgerEntry> store = new ConcurrentHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override public <S extends GoldLedgerEntry> S save(S entity) {
            if (entity.getId() == null) entity.setId(seq.getAndIncrement());
            store.put(entity.getId(), entity);
            return entity;
        }
        @Override public Optional<GoldLedgerEntry> findById(Long id) { return Optional.ofNullable(store.get(id)); }
        @Override public Optional<GoldLedgerEntry> findByVoucherNumber(String voucherNumber) {
            return store.values().stream().filter(e -> e.getVoucherNumber().equals(voucherNumber)).findFirst();
        }
        @Override public Optional<GoldLedgerEntry> findByIdempotencyKey(String key) {
            if (key == null) return Optional.empty();
            return store.values().stream().filter(e -> key.equals(e.getIdempotencyKey())).findFirst();
        }
        @Override public List<GoldLedgerEntry> findByJobOrderIdOrderByCreatedAtAsc(Long jobId) {
            return store.values().stream().filter(e -> e.getJobOrder() != null && e.getJobOrder().getId().equals(jobId)).toList();
        }
        @Override public List<GoldLedgerEntry> findByKarigarIdOrderByCreatedAtDesc(Long karigarId) {
            return store.values().stream().filter(e -> e.getKarigar().getId().equals(karigarId)).toList();
        }
        @Override public List<GoldLedgerEntry> findTop50ByOrderByCreatedAtDesc() {
            return store.values().stream().sorted(Comparator.comparing(GoldLedgerEntry::getCreatedAt).reversed()).limit(50).toList();
        }
        @Override public BigDecimal sumFineWeightByJobAndType(Long jobId, TransactionType type) {
            return store.values().stream()
                    .filter(e -> e.getJobOrder() != null && e.getJobOrder().getId().equals(jobId) && e.getTransactionType() == type)
                    .map(GoldLedgerEntry::getFineWeight)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        @Override public BigDecimal sumFineWeightByKarigarAndType(Long karigarId, TransactionType type) {
            return store.values().stream()
                    .filter(e -> e.getKarigar().getId().equals(karigarId) && e.getTransactionType() == type)
                    .map(GoldLedgerEntry::getFineWeight)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        @Override public BigDecimal sumFineWeightByType(TransactionType type) {
            return store.values().stream()
                    .filter(e -> e.getTransactionType() == type)
                    .map(GoldLedgerEntry::getFineWeight)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        @Override public List<GoldLedgerEntry> findAll() { return new ArrayList<>(store.values()); }
        @Override public void deleteAll() { store.clear(); }
        @Override public void flush() {}
        @Override public <S extends GoldLedgerEntry> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends GoldLedgerEntry> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<GoldLedgerEntry> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public GoldLedgerEntry getOne(Long aLong) { return null; }
        @Override public GoldLedgerEntry getById(Long aLong) { return null; }
        @Override public GoldLedgerEntry getReferenceById(Long aLong) { return null; }
        @Override public <S extends GoldLedgerEntry> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends GoldLedgerEntry> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends GoldLedgerEntry> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends GoldLedgerEntry> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends GoldLedgerEntry> long count(Example<S> example) { return 0; }
        @Override public <S extends GoldLedgerEntry> boolean exists(Example<S> example) { return false; }
        @Override public <S extends GoldLedgerEntry, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends GoldLedgerEntry> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(Long aLong) { return store.containsKey(aLong); }
        @Override public List<GoldLedgerEntry> findAllById(Iterable<Long> longs) { return null; }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(Long aLong) { store.remove(aLong); }
        @Override public void delete(GoldLedgerEntry entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends GoldLedgerEntry> entities) {}
        @Override public List<GoldLedgerEntry> findAll(Sort sort) { return null; }
        @Override public Page<GoldLedgerEntry> findAll(Pageable pageable) { return null; }
    }

    public static class InMemoryLossAlertRepository implements LossAlertRepository {
        public final Map<Long, LossAlert> store = new ConcurrentHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override public <S extends LossAlert> S save(S entity) {
            if (entity.getId() == null) entity.setId(seq.getAndIncrement());
            store.put(entity.getId(), entity);
            return entity;
        }
        @Override public List<LossAlert> findByStatusOrderByCreatedAtDesc(AlertStatus status) {
            return store.values().stream().filter(a -> a.getStatus() == status).toList();
        }
        @Override public List<LossAlert> findAllByOrderByCreatedAtDesc() {
            return new ArrayList<>(store.values());
        }
        @Override public List<LossAlert> findByKarigarIdOrderByCreatedAtDesc(Long karigarId) {
            return store.values().stream().filter(a -> a.getKarigar().getId().equals(karigarId)).toList();
        }
        @Override public long countByStatus(AlertStatus status) {
            return store.values().stream().filter(a -> a.getStatus() == status).count();
        }
        @Override public void deleteAll() { store.clear(); }
        @Override public void flush() {}
        @Override public <S extends LossAlert> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends LossAlert> List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
        @Override public void deleteAllInBatch(Iterable<LossAlert> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override public void deleteAllInBatch() {}
        @Override public LossAlert getOne(Long aLong) { return null; }
        @Override public LossAlert getById(Long aLong) { return null; }
        @Override public LossAlert getReferenceById(Long aLong) { return null; }
        @Override public <S extends LossAlert> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends LossAlert> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends LossAlert> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends LossAlert> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends LossAlert> long count(Example<S> example) { return 0; }
        @Override public <S extends LossAlert> boolean exists(Example<S> example) { return false; }
        @Override public <S extends LossAlert, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public <S extends LossAlert> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public List<LossAlert> findAll() { return new ArrayList<>(store.values()); }
        @Override public List<LossAlert> findAllById(Iterable<Long> longs) { return null; }
        @Override public Optional<LossAlert> findById(Long aLong) { return Optional.ofNullable(store.get(aLong)); }
        @Override public boolean existsById(Long aLong) { return store.containsKey(aLong); }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(Long aLong) { store.remove(aLong); }
        @Override public void delete(LossAlert entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override public void deleteAll(Iterable<? extends LossAlert> entities) {}
        @Override public List<LossAlert> findAll(Sort sort) { return null; }
        @Override public Page<LossAlert> findAll(Pageable pageable) { return null; }
    }
}
